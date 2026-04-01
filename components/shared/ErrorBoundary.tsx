"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Props = { children: ReactNode; fallbackTitle?: string }

type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 flex justify-center">
          <Card className="max-w-md w-full border-red-200">
            <CardHeader>
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                <CardTitle>{this.props.fallbackTitle ?? "Something went wrong"}</CardTitle>
              </div>
              <CardDescription>
                {this.state.error.message || "An unexpected error occurred."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" onClick={() => this.setState({ error: null })}>
                Try again
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
    return this.props.children
  }
}
