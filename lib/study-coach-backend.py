## Study Coach Agent with Tools - FULL VERSION

import os, sqlite3, json, re
from typing import Dict, List, Optional
from dotenv import load_dotenv
from PyPDF2 import PdfReader
from langchain.chat_models import init_chat_model
from langchain.tools import tool
from langchain.schema import SystemMessage, HumanMessage
from langchain.agents import create_openai_tools_agent, AgentExecutor
from langchain import hub

DB_PATH = "data/study_coach.db"
os.makedirs("data", exist_ok=True)

load_dotenv()
llm = init_chat_model("llama-3.3-70b-versatile", model_provider="groq")

# ---------- Database Functions ---------- #
def init_db():
    """Initialize database with tables for resources, topics, and quizzes."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Resources table (files)
    c.execute("""CREATE TABLE IF NOT EXISTS resources(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT,
        content TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );""")
    
    # Topics table (extracted from files)
    c.execute("""CREATE TABLE IF NOT EXISTS topics(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER,
        topic_name TEXT,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(file_id) REFERENCES resources(id)
    );""")
    
    # Updated quizzes table (linked to topics)
    c.execute("""CREATE TABLE IF NOT EXISTS quizzes(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id INTEGER,
        topic_id INTEGER,
        topic_name TEXT,
        question TEXT,
        option_a TEXT, option_b TEXT, option_c TEXT, option_d TEXT,
        correct_answer TEXT, explanation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(resource_id) REFERENCES resources(id),
        FOREIGN KEY(topic_id) REFERENCES topics(id)
    );""")
    
    conn.commit()
    conn.close()

def save_resource(file_name: str, content: str) -> int:
    """Save a study resource (PDF text) to DB."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("INSERT INTO resources(file_name, content) VALUES (?, ?)", (file_name, content))
    conn.commit()
    rid = cur.lastrowid
    conn.close()
    return rid

def save_topic(file_id: int, topic_name: str, content: str) -> int:
    """Save a topic to DB."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("INSERT INTO topics(file_id, topic_name, content) VALUES (?, ?, ?)", 
                (file_id, topic_name, content))
    conn.commit()
    tid = cur.lastrowid
    conn.close()
    return tid

def get_all_resources() -> List[Dict]:
    """Get all resources from database."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, file_name, uploaded_at FROM resources ORDER BY uploaded_at DESC")
    rows = cur.fetchall()
    conn.close()
    
    resources = []
    for row in rows:
        resources.append({
            'id': row[0],
            'name': row[1],
            'upload_date': row[2][:10] if row[2] else ''
        })
    return resources

def get_topics_for_resource(resource_id: int) -> List[Dict]:
    """Get all topics for a resource."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, topic_name FROM topics WHERE file_id = ? ORDER BY id", (resource_id,))
    rows = cur.fetchall()
    conn.close()
    
    topics = []
    for row in rows:
        topics.append({
            'id': row[0],
            'name': row[1]
        })
    return topics

def get_topic_content(topic_id: int) -> str:
    """Get topic content by ID."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT content FROM topics WHERE id = ?", (topic_id,))
    result = cur.fetchone()
    conn.close()
    return result[0] if result else ""

def get_topic_name(topic_id: int) -> str:
    """Get topic name by ID."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT topic_name FROM topics WHERE id = ?", (topic_id,))
    result = cur.fetchone()
    conn.close()
    return result[0] if result else ""

# ---------- Tools ---------- #

@tool
def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract text content from a PDF file and save it as a resource.
    
    This tool will:
    1. Read the PDF file from the specified path
    2. Extract all text content from all pages
    3. Save the content to the database as a new resource
    4. Return confirmation with the resource ID
    
    Args:
        file_path: Full path to the PDF file to extract text from
        
    Returns:
        Success message with resource ID, or error message if failed
        
    Example usage:
        extract_text_from_pdf("/Users/student/textbook.pdf")
    """
    try:
        if not os.path.exists(file_path):
            return f"Error: File not found at {file_path}"
        
        reader = PdfReader(file_path)
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        
        if not text.strip():
            return "Error: Could not extract text from PDF - file may be empty or corrupted"
        
        # Save to database
        resource_id = save_resource(os.path.basename(file_path), text)
        
        return f"Successfully extracted text from {os.path.basename(file_path)}. Saved as resource ID {resource_id}. Text contains {len(text)} characters."
        
    except Exception as e:
        return f"Error extracting PDF: {str(e)}"

@tool
def extract_topics_from_resource(resource_id: int) -> str:
    """
    Extract topics from a previously uploaded resource using AI analysis.
    
    This tool will:
    1. Retrieve the content from the specified resource
    2. Use AI to analyze and identify main topics/chapters/sections
    3. Automatically ignore non-content sections (table of contents, syllabus, etc.)
    4. Save each topic with its content to the database
    5. Return a list of extracted topics with their IDs
    
    Args:
        resource_id: The ID of the resource to extract topics from
        
    Returns:
        List of extracted topics with their database IDs, or error message
        
    Example usage:
        extract_topics_from_resource(1)
    """
    try:
        # Get resource content
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        result = c.execute("SELECT content, file_name FROM resources WHERE id=?", (resource_id,)).fetchone()
        
        if not result:
            conn.close()
            return f"Error: Resource with ID {resource_id} not found"
        
        text, filename = result
        
        # Check if topics already exist
        existing_topics = c.execute("SELECT COUNT(*) FROM topics WHERE file_id=?", (resource_id,)).fetchone()[0]
        if existing_topics > 0:
            topics = c.execute("SELECT id, topic_name FROM topics WHERE file_id=? ORDER BY id", (resource_id,)).fetchall()
            conn.close()
            topic_list = "\n".join([f"  {tid}: {tname}" for tid, tname in topics])
            return f"Topics already exist for {filename}:\n{topic_list}"
        
        conn.close()
        
        # Use LLM to extract topics
        prompt = f"""
        Analyze this document and extract the main topics/chapters/sections. 
        
        IMPORTANT: IGNORE and SKIP any of these sections:
        - Table of Contents
        - Syllabus 
        - Index
        - References
        - Bibliography
        - Preface
        - Introduction pages
        - Course outline
        - Grading information
        
        Only extract actual subject matter topics/chapters with substantial educational content.
        
        For each topic, provide:
        - A clear, descriptive topic name
        - The full content for that topic
        
        Return ONLY a JSON array with no additional text:
        [
            {{
                "topic_name": "Clear topic name here",
                "content": "Full topic content here"
            }}
        ]
        
        Document content:
        {text[:40000]}
        """
        
        response = llm.invoke(prompt)
        raw = response.content if hasattr(response, 'content') else str(response)
        
        try:
            topics_data = json.loads(raw)
        except Exception:
            match = re.search(r'\[.*\]', raw, re.DOTALL)
            topics_data = json.loads(match.group()) if match else []
        
        if not topics_data:
            return "Error: Could not extract topics from the document. The content may not contain clear topic divisions."
        
        # Save topics to database
        topic_list = []
        for topic in topics_data:
            topic_id = save_topic(resource_id, topic["topic_name"], topic["content"])
            topic_list.append(f"  {topic_id}: {topic['topic_name']}")
        
        return f"Successfully extracted {len(topics_data)} topics from {filename}:\n" + "\n".join(topic_list)
        
    except Exception as e:
        return f"Error extracting topics: {str(e)}"

@tool
def list_available_resources() -> str:
    """
    List all available resources (uploaded files) in the database.
    
    This tool shows all PDF files that have been uploaded and are available
    for topic extraction and quiz generation. Each resource is shown with
    its ID and filename.
    
    Returns:
        Formatted list of all resources with their IDs, or message if no resources found
        
    Example output:
        Available resources:
          1: textbook_chapter1.pdf
          2: lecture_notes.pdf
          3: study_guide.pdf
    """
    try:
        resources = get_all_resources()
        
        if not resources:
            return "No resources found. Please upload a PDF file first using extract_text_from_pdf."
        
        resource_list = "\n".join([f"  {r['id']}: {r['name']}" for r in resources])
        return f"Available resources:\n{resource_list}"
        
    except Exception as e:
        return f"Error listing resources: {str(e)}"

@tool
def list_topics_for_resource(resource_id: int) -> str:
    """
    List all topics that have been extracted from a specific resource.
    
    This tool shows all topics/chapters/sections that were identified and
    extracted from the specified resource. Each topic is shown with its
    ID and name, which can be used for quiz generation.
    
    Args:
        resource_id: The ID of the resource to list topics for
        
    Returns:
        Formatted list of topics for the resource, or error message
        
    Example usage:
        list_topics_for_resource(1)
        
    Example output:
        Topics for textbook.pdf:
          1: Introduction to Programming
          2: Variables and Data Types
          3: Control Structures
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Get resource name
        resource_result = c.execute("SELECT file_name FROM resources WHERE id=?", (resource_id,)).fetchone()
        if not resource_result:
            conn.close()
            return f"Error: Resource with ID {resource_id} not found"
        
        filename = resource_result[0]
        
        # Get topics
        topics = c.execute("SELECT id, topic_name FROM topics WHERE file_id=? ORDER BY id", (resource_id,)).fetchall()
        conn.close()
        
        if not topics:
            return f"No topics found for {filename}. Please extract topics first using extract_topics_from_resource."
        
        topic_list = "\n".join([f"  {tid}: {tname}" for tid, tname in topics])
        return f"Topics for {filename}:\n{topic_list}"
        
    except Exception as e:
        return f"Error listing topics: {str(e)}"

@tool
def generate_quiz_from_topic(resource_id: int, topic_id: int, num_questions: int) -> str:
    """
    Generate quiz questions from a specific topic using AI.
    
    This tool will:
    1. Retrieve the content for the specified topic
    2. Use AI to generate multiple-choice questions based on the topic content
    3. Create questions with 4 options (a, b, c, d), correct answer, and explanations
    4. Save all questions to the database
    5. Display the formatted quiz for the user
    
    Args:
        resource_id: The ID of the resource containing the topic
        topic_id: The ID of the specific topic to generate quiz from
        num_questions: Number of questions to generate (1-10)
        
    Returns:
        Formatted quiz with questions, options, answers and explanations, or error message
        
    Example usage:
        generate_quiz_from_topic(1, 3, 5)
        
    Example output:
        Generated 5 questions for Control Structures:
        
        [TOPIC: Control Structures] 1. What is a loop in programming?
          a) A function that calls itself
          b) A sequence of instructions that repeats
          c) A variable declaration
          d) A conditional statement
        Answer: b
        Explanation: A loop is a programming construct that repeats a block of code...
    """
    try:
        if num_questions < 1 or num_questions > 10:
            return "Error: Number of questions must be between 1 and 10"
        
        # Get topic information
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        topic_result = c.execute("SELECT topic_name, content FROM topics WHERE id=?", (topic_id,)).fetchone()
        if not topic_result:
            conn.close()
            return f"Error: Topic with ID {topic_id} not found"
        
        topic_name, topic_content = topic_result
        
        # Generate quiz using LLM
        prompt = f"""
        Create {num_questions} multiple-choice quiz questions based on this specific topic.
        
        Topic: {topic_name}
        
        For each question, ensure:
        - Questions test understanding, not just memorization
        - All 4 options are plausible
        - Only one option is clearly correct
        - Explanations are educational and helpful
        
        Return ONLY a JSON array with no additional text:
        [
            {{
                "topic_name": "{topic_name}",
                "question": "Question text here",
                "options": {{"a": "Option A", "b": "Option B", "c": "Option C", "d": "Option D"}},
                "correct": "a",
                "explanation": "Clear explanation of why this answer is correct"
            }}
        ]
        
        Topic content:
        {topic_content[:8000]}
        """
        
        response = llm.invoke(prompt)
        raw = response.content if hasattr(response, 'content') else str(response)
        
        try:
            quiz_data = json.loads(raw)
        except Exception:
            match = re.search(r'\[.*\]', raw, re.DOTALL)
            quiz_data = json.loads(match.group()) if match else []
        
        if not quiz_data:
            conn.close()
            return f"Error: Could not generate quiz questions for {topic_name}. Please try again."
        
        # Save questions to database
        for item in quiz_data:
            opts = item["options"]
            c.execute("""INSERT INTO quizzes(resource_id,topic_id,topic_name,question,option_a,option_b,option_c,option_d,
                         correct_answer,explanation) VALUES(?,?,?,?,?,?,?,?,?,?)""",
                      (resource_id, topic_id, topic_name, item["question"], 
                       opts.get("a"), opts.get("b"), opts.get("c"), opts.get("d"),
                       item["correct"], item["explanation"]))
        
        conn.commit()
        conn.close()
        
        # Format quiz for display
        quiz_text = f"Generated {len(quiz_data)} questions for {topic_name}:\n\n"
        
        for i, item in enumerate(quiz_data, 1):
            opts = item["options"]
            quiz_text += f"[TOPIC: {topic_name}] {i}. {item['question']}\n"
            quiz_text += f"  a) {opts['a']}\n"
            quiz_text += f"  b) {opts['b']}\n"
            quiz_text += f"  c) {opts['c']}\n"
            quiz_text += f"  d) {opts['d']}\n"
            quiz_text += f"Answer: {item['correct']}\n"
            quiz_text += f"Explanation: {item['explanation']}\n\n"
        
        return quiz_text
        
    except Exception as e:
        return f"Error generating quiz: {str(e)}"

@tool
def generate_quiz_from_all_topics(resource_id: int, num_questions_per_topic: int) -> str:
    """
    Generate quiz questions from all topics of a resource.
    
    This tool will:
    1. Get all topics for the specified resource
    2. Generate the specified number of questions from each topic
    3. Combine all questions into one comprehensive quiz
    4. Save all questions to the database
    5. Display the complete quiz organized by topic
    
    Args:
        resource_id: The ID of the resource to generate quiz from
        num_questions_per_topic: Number of questions to generate per topic (1-5)
        
    Returns:
        Comprehensive quiz with questions from all topics, or error message
        
    Example usage:
        generate_quiz_from_all_topics(1, 2)
        
    This will generate 2 questions from each topic in resource 1.
    """
    try:
        if num_questions_per_topic < 1 or num_questions_per_topic > 5:
            return "Error: Number of questions per topic must be between 1 and 5"
        
        # Get all topics for the resource
        topics = get_topics_for_resource(resource_id)
        
        if not topics:
            return f"No topics found for resource {resource_id}. Please extract topics first."
        
        total_questions = 0
        all_quiz_text = f"Comprehensive quiz from all topics (Resource ID {resource_id}):\n"
        all_quiz_text += "=" * 60 + "\n\n"
        
        for topic in topics:
            topic_id = topic['id']
            topic_name = topic['name']
            
            # Generate questions for this topic
            result = generate_quiz_from_topic(resource_id, topic_id, num_questions_per_topic)
            
            if "Generated" in result and "questions for" in result:
                # Extract just the quiz part
                quiz_lines = result.split('\n')
                topic_quiz = []
                in_quiz = False
                
                for line in quiz_lines:
                    if line.startswith("[TOPIC:"):
                        in_quiz = True
                    if in_quiz:
                        topic_quiz.append(line)
                
                if topic_quiz:
                    all_quiz_text += "\n".join(topic_quiz) + "\n"
                    total_questions += num_questions_per_topic
            else:
                all_quiz_text += f"Could not generate questions for topic: {topic_name}\n\n"
        
        if total_questions > 0:
            return f"Successfully generated {total_questions} questions from {len(topics)} topics!\n\n{all_quiz_text}"
        else:
            return "Error: Could not generate any questions. Please try again or check if topics have sufficient content."
        
    except Exception as e:
        return f"Error generating comprehensive quiz: {str(e)}"

# ---------- Agent Setup ---------- #
def create_study_coach_agent():
    """Create the study coach agent with tools."""
    
    tools = [
        extract_text_from_pdf,
        extract_topics_from_resource,
        list_available_resources,
        list_topics_for_resource,
        generate_quiz_from_topic,
        generate_quiz_from_all_topics
    ]
    
    system_message = """You are a Study Coach AI assistant. You help students study effectively by:

1. Extracting text from PDF files
2. Breaking down study materials into focused topics
3. Creating personalized quizzes from specific topics or all topics

IMPORTANT BEHAVIORAL RULES:
- Only use a tool when the user explicitly requests the matching action
- Never automatically run multiple tools in sequence without user consent
- If the user asks for a quiz but doesn't specify topic or question count, ASK them first
- Always confirm what you're doing before using tools
- Be conversational, helpful, and educational
- Respond only once per user message

CONVERSATION FLOW GUIDELINES:
- When user mentions a file path, use extract_text_from_pdf
- When user asks about topics or wants to extract topics, use extract_topics_from_resource  
- When user asks for a quiz, first check what topics are available if not specified
- If information is missing (topic choice, question count), ask the user to provide it
- Always explain what each tool does when you use it

TOOL USAGE RULES:
- extract_text_from_pdf: Only when user provides a file path
- extract_topics_from_resource: Only when user explicitly asks to extract/analyze topics
- list_available_resources: When user asks what files/resources are available
- list_topics_for_resource: When user asks what topics exist for a resource
- generate_quiz_from_topic: Only when user requests quiz from specific topic with question count
- generate_quiz_from_all_topics: Only when user requests quiz from all topics with question count

Remember: You are a helpful study assistant, not an autonomous system. Wait for user instructions before taking actions."""

    # Create agent with proper prompt template
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_message),
        MessagesPlaceholder(variable_name="chat_history", optional=True),
        ("user", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])
    
    agent = create_openai_tools_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(
        agent=agent, 
        tools=tools, 
        verbose=False,  # Set to False to prevent double output
        handle_parsing_errors=True,
        max_iterations=3  # Limit iterations to prevent loops
    )
    
    return agent_executor

# ---------- Chat Interface ---------- #
def chat_with_agent():
    """Main chat interface with the study coach agent."""
    
    init_db()
    print("🎓 Study Coach AI Agent")
    print("=" * 40)
    print("Hello! I'm your Study Coach AI assistant.")
    print("\nI can help you:")
    print("• Extract text from PDF files")
    print("• Break down content into topics")
    print("• Generate custom quizzes")
    print("\nJust tell me what you'd like to do!")
    print("\nType 'exit' to quit, 'help' for more info")
    print("=" * 40)
    
    agent = create_study_coach_agent()
    chat_history = []
    
    while True:
        try:
            user_input = input("\n💬 You: ").strip()
            
            if user_input.lower() in ['exit', 'quit']:
                print("👋 Goodbye! Happy studying!")
                break
                
            if user_input.lower() == 'help':
                print("""
🔧 Available Commands:
• "Extract text from /path/to/file.pdf" - Upload and process PDF
• "Extract topics from resource X" - Break resource into topics  
• "Show me available resources" - List uploaded files
• "Show topics for resource X" - List topics for a resource
• "Generate quiz from topic X with Y questions" - Create quiz from specific topic
• "Generate quiz from all topics with X questions each" - Quiz from all topics

📝 Example conversation:
You: "Extract text from /Users/john/textbook.pdf"
AI: *extracts text and saves as resource*
You: "Extract topics from resource 1" 
AI: *breaks content into topics*
You: "Show topics for resource 1"
AI: *shows available topics*
You: "Generate quiz from topic 3 with 5 questions"
AI: *creates and shows quiz*
                """)
                continue
                
            if not user_input:
                continue
            
            print("\n🤖 Study Coach:", end=" ")
            
            # Get response from agent
            response = agent.invoke({
                "input": user_input,
                "chat_history": chat_history
            })
            
            print(response["output"])
            
            # Update chat history (keep it manageable)
            chat_history.extend([
                HumanMessage(content=user_input),
                SystemMessage(content=response["output"])
            ])
            
            # Keep chat history manageable
            if len(chat_history) > 10:
                chat_history = chat_history[-6:]
                
        except KeyboardInterrupt:
            print("\n👋 Goodbye! Happy studying!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
            print("Please try again or type 'help' for guidance.")

if __name__ == "__main__":
    chat_with_agent()
