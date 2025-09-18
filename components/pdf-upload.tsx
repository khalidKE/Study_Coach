"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Trash2 } from "lucide-react"

interface PDFUploadComponentProps {
  onResourcesUpdate: (resources: any[]) => void
}

interface UploadedFile {
  id: string
  name: string
  size: number
  status: "uploading" | "processing" | "completed" | "error"
  progress: number
  resourceId?: number
  error?: string
}

export function PDFUploadComponent({ onResourcesUpdate }: PDFUploadComponentProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      status: "uploading",
      progress: 0,
    }))

    setFiles((prev) => [...prev, ...newFiles])

    // Process each file
    for (const [index, file] of acceptedFiles.entries()) {
      const fileId = newFiles[index].id

      try {
        // Update progress to show uploading
        setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress: 25 } : f)))

        // Upload file
        const formData = new FormData()
        formData.append("file", file)

        const uploadResponse = await fetch("/api/upload-pdf", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error("Upload failed")
        }

        const uploadData = await uploadResponse.json()

        // Update progress to show processing
        setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "processing", progress: 50 } : f)))

        // Extract text from PDF
        const extractResponse = await fetch("/api/extract-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filepath: uploadData.filepath,
            filename: uploadData.originalName,
          }),
        })

        if (!extractResponse.ok) {
          throw new Error("Text extraction failed")
        }

        const extractData = await extractResponse.json()

        // Update progress to completed
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: "completed",
                  progress: 100,
                  resourceId: extractData.resourceId,
                }
              : f,
          ),
        )

        // Refresh resources list
        fetchResources()
      } catch (error) {
        console.error("File processing error:", error)
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: "error",
                  error: error instanceof Error ? error.message : "Processing failed",
                }
              : f,
          ),
        )
      }
    }
  }, [])

  const fetchResources = async () => {
    try {
      const response = await fetch("/api/resources")
      const data = await response.json()
      if (data.success) {
        onResourcesUpdate(data.resources)
      }
    } catch (error) {
      console.error("Failed to fetch resources:", error)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: true,
    maxSize: 50 * 1024 * 1024, // 50MB
  })

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
      case "processing":
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusText = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
        return "Uploading..."
      case "processing":
        return "Extracting text..."
      case "completed":
        return "Ready for topic extraction"
      case "error":
        return "Failed"
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-balance mb-4">Upload Your Study Materials</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Upload PDF files and let our AI extract key topics and concepts for personalized learning.
        </p>
      </div>

      {/* Upload Area */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
              ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-accent/50"
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>

              {isDragActive ? (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Drop your PDFs here</h3>
                  <p className="text-muted-foreground">Release to upload your study materials</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Drag & drop PDF files here</h3>
                  <p className="text-muted-foreground mb-4">or click to browse your computer</p>
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Choose Files
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">Supports PDF files up to 50MB • Multiple files allowed</p>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Uploaded Files ({files.length})
            </CardTitle>
            <CardDescription>Track the progress of your file uploads and processing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {files.map((file) => (
              <div key={file.id} className="p-4 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(file.status)}
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {getStatusText(file.status)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {file.status === "completed" && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ready
                      </Badge>
                    )}
                    {file.status === "error" && (
                      <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Error
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)} className="h-8 w-8 p-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {(file.status === "uploading" || file.status === "processing") && (
                  <Progress value={file.progress} className="h-2" />
                )}

                {file.status === "error" && file.error && (
                  <Alert className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{file.error}</AlertDescription>
                  </Alert>
                )}

                {file.status === "completed" && (
                  <div className="mt-3 p-3 rounded-md bg-green-500/5 border border-green-500/20">
                    <p className="text-sm text-green-600">
                      Text extracted successfully! Resource ID: {file.resourceId}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You can now extract topics from this document in the Topics tab.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-3">
                <span className="text-primary font-semibold">1</span>
              </div>
              <h4 className="font-medium mb-2">Upload PDF</h4>
              <p className="text-sm text-muted-foreground">Drag and drop your study materials or click to browse</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-3">
                <span className="text-primary font-semibold">2</span>
              </div>
              <h4 className="font-medium mb-2">AI Processing</h4>
              <p className="text-sm text-muted-foreground">
                Our AI extracts and analyzes the text content automatically
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-3">
                <span className="text-primary font-semibold">3</span>
              </div>
              <h4 className="font-medium mb-2">Ready to Learn</h4>
              <p className="text-sm text-muted-foreground">Extract topics and generate quizzes from your materials</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
