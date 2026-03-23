"use client";

import { useState, useEffect } from "react";
import { LocalDebateStorage, type DebateStorage } from "@/lib/history";
import { SavedDebate } from "@/lib/types";

interface HistorySidebarProps {
  open: boolean;
  onClose: () => void;
  onLoad: (debate: SavedDebate) => void;
  maxSavedDebates: number;
}

export function HistorySidebar({
  open,
  onClose,
  onLoad,
  maxSavedDebates,
}: HistorySidebarProps) {
  const [storage] = useState<DebateStorage>(
    () => new LocalDebateStorage(maxSavedDebates)
  );
  const [debates, setDebates] = useState<SavedDebate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      loadDebates();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setDebates(storage.search(searchQuery));
    } else {
      setDebates(storage.getAll());
    }
  }, [searchQuery, storage]);

  const loadDebates = () => {
    setDebates(storage.getAll());
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storage.remove(id);
    loadDebates();
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all debate history?")) {
      storage.clear();
      loadDebates();
    }
  };

  const handleLoad = (debate: SavedDebate) => {
    onLoad(debate);
    onClose();
  };

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
  };

  const truncatePrompt = (prompt: string, maxLength: number = 60): string => {
    if (prompt.length <= maxLength) return prompt;
    return prompt.slice(0, maxLength) + "...";
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "converged":
        return "rgba(0, 200, 0, 0.7)";
      case "stopped":
        return "rgba(200, 200, 0, 0.7)";
      case "error":
        return "rgba(200, 0, 0, 0.7)";
      default:
        return "rgba(150, 150, 150, 0.7)";
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 999,
        }}
      />

      {/* Sidebar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "400px",
          backgroundColor: "var(--duo-bg)",
          color: "var(--duo-fg)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          fontFamily: "monospace",
          boxShadow: "2px 0 10px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>
            Debate History
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--duo-fg)",
              fontSize: "20px",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "16px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <input
            type="text"
            placeholder="Search debates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              fontFamily: "monospace",
              fontSize: "14px",
              backgroundColor: "var(--duo-bg)",
              color: "var(--duo-fg)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "4px",
              outline: "none",
            }}
          />
        </div>

        {/* Debate List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px",
          }}
        >
          {debates.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.5)",
              }}
            >
              {searchQuery ? "No matching debates found" : "No saved debates yet"}
            </div>
          ) : (
            debates.map((debate) => (
              <div
                key={debate.id}
                onClick={() => handleLoad(debate)}
                style={{
                  padding: "12px",
                  marginBottom: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.02)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ flex: 1, marginRight: "8px" }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        marginBottom: "4px",
                      }}
                    >
                      {truncatePrompt(debate.prompt)}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "rgba(255, 255, 255, 0.6)",
                      }}
                    >
                      {formatTimestamp(debate.timestamp)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(debate.id, e)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255, 255, 255, 0.5)",
                      fontSize: "16px",
                      cursor: "pointer",
                      padding: "0 4px",
                      lineHeight: 1,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "rgba(255, 0, 0, 0.8)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)";
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      fontSize: "11px",
                      borderRadius: "3px",
                      backgroundColor: getStatusColor(debate.status),
                      color: "var(--duo-bg)",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                    }}
                  >
                    {debate.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {debates.length > 0 && (
          <div
            style={{
              padding: "16px",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <button
              onClick={handleClearAll}
              style={{
                width: "100%",
                padding: "10px",
                fontFamily: "monospace",
                fontSize: "14px",
                backgroundColor: "rgba(200, 0, 0, 0.2)",
                color: "var(--duo-fg)",
                border: "1px solid rgba(200, 0, 0, 0.5)",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(200, 0, 0, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(200, 0, 0, 0.2)";
              }}
            >
              Clear All History
            </button>
          </div>
        )}
      </div>
    </>
  );
}
