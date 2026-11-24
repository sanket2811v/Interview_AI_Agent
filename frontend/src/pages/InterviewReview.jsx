import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  User,
  Search,
  Filter,
  Copy,
  Check,
  Clock,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { PageHeader } from "../components/common/PageHeader.jsx";
import { LoadingState } from "../components/common/LoadingState.jsx";
import { mockInterviewService } from "../services/mockInterviewService.js";
import { evaluationService } from '../services/evaluationService.js';

export function InterviewReview() {
  const { interviewId } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL"); // 'ALL' | 'ASSISTANT' | 'USER'
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const data = await mockInterviewService.getInterview(interviewId);
        setInterview(data);
        setMessages(data?.messages || []);
      } catch (err) {
        setErrorMessage(
          err.response?.data?.message ||
            err.message ||
            "Failed to load interview history",
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [interviewId]);

  const handleEvaluate = async () => {
    try {
      setIsEvaluating(true);
      const res = await evaluationService.evaluateInterview(interviewId);
      const evalId = res?.evaluation?.id || res?.id;
      if (evalId) {
        navigate(`/evaluations/${evalId}`);
      } else {
        navigate('/evaluations');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Evaluation generation failed');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCopyTranscript = () => {
    if (!messages.length) return;
    const text = messages
      .map(
        (m) =>
          `[${new Date(m.createdAt).toLocaleTimeString()}] ${m.role === "ASSISTANT" ? "AI INTERVIEWER" : "CANDIDATE"}:\n${m.content}\n`,
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingState message="Loading interview transcript..." />
      </div>
    );
  }

  if (errorMessage || !interview) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Transcript Error
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {errorMessage}
        </p>
        <Button
          variant="secondary"
          onClick={() => navigate("/mock-interviews")}
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const filteredMessages = messages.filter((m) => {
    const matchesRole = roleFilter === "ALL" || m.role === roleFilter;
    const matchesSearch =
      !searchTerm || m.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <PageHeader
        title={interview.title}
        subtitle={`Transcript Review • ${new Date(interview.createdAt).toLocaleDateString()} • Duration: ${Math.round((interview.duration || 0) / 60)} minutes`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              iconLeft={copied ? Check : Copy}
              onClick={handleCopyTranscript}
            >
              {copied ? "Copied" : "Copy Transcript"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={Sparkles}
              loading={isEvaluating}
              onClick={handleEvaluate}
            >
              Evaluate with AI
            </Button>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={ArrowLeft}
              onClick={() => navigate("/mock-interviews")}
            >
              Dashboard
            </Button>
          </div>
        }
      />

      {/* Metadata Overview Card */}
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Badge variant="primary" size="sm">
            {interview.interviewType}
          </Badge>
          <Badge variant="outline" size="sm">
            {interview.difficulty}
          </Badge>
          <Badge variant="secondary" size="sm">
            {interview.status}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 font-mono">
          <span>{messages.length} total exchanges</span>
          <span>•</span>
          <span>{interview.interviewerPersonality} style</span>
        </div>
      </Card>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search dialogue transcript..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#151C2E] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#151C2E] text-xs font-semibold px-3 py-2 text-slate-800 dark:text-slate-200"
        >
          <option value="ALL">All Participants</option>
          <option value="ASSISTANT">AI Interviewer Only</option>
          <option value="USER">Candidate Answers Only</option>
        </select>
      </div>

      {/* Dialogue Stream */}
      <div className="space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            No dialogue matches the current filter.
          </div>
        ) : (
          filteredMessages.map((msg, idx) => {
            const isInterviewer = msg.role === "ASSISTANT";

            return (
              <Card
                key={msg.id || idx}
                className={`p-5 space-y-2 border ${
                  isInterviewer
                    ? "border-violet-500/20 bg-white dark:bg-[#151C2E]"
                    : "border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#0B1020]"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-1.5 rounded-lg text-white ${
                        isInterviewer ? "bg-violet-600" : "bg-slate-700"
                      }`}
                    >
                      {isInterviewer ? (
                        <Sparkles className="h-3.5 w-3.5" />
                      ) : (
                        <User className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span
                      className={
                        isInterviewer
                          ? "text-violet-600 dark:text-violet-400"
                          : "text-slate-700 dark:text-slate-300"
                      }
                    >
                      {isInterviewer ? "AI Interviewer" : "Candidate"}
                    </span>
                    {msg.messageType && msg.messageType !== "TEXT" && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-violet-500/10 text-violet-400 uppercase font-mono">
                        {msg.messageType.replace("_", " ")}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed pt-1">
                  {msg.content}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export default InterviewReview;
