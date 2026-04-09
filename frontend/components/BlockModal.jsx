import { useState } from "react";

export default function BlockModal({ isOpen, onClose, onBlock, onReport, userName, isBlocking, isReporting }) {
    const [selectedAction, setSelectedAction] = useState("block");
    const [reason, setReason] = useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="personax-card w-full max-w-md rounded-3xl border border-slate-700 p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                    {selectedAction === "block" ? "Block User" : "Report User"}
                </h2>

                {/* Action Selector */}
                <div className="flex gap-2 mb-6 border-b border-slate-700 pb-4">
                    {["block", "report"].map((action) => (
                        <button
                            key={action}
                            onClick={() => setSelectedAction(action)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${selectedAction === action
                                    ? "bg-red-600 text-white"
                                    : "border border-slate-600 text-slate-300 hover:border-slate-500"
                                }`}
                        >
                            {action === "block" ? "🚫 Block" : "🚩 Report"}
                        </button>
                    ))}
                </div>

                {/* Reason (for report) */}
                {selectedAction === "report" && (
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                            Report Reason
                        </label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white focus:border-red-500 focus:outline-none"
                        >
                            <option value="">Select a reason...</option>
                            <option value="harassment">Harassment or bullying</option>
                            <option value="inappropriate">Inappropriate content</option>
                            <option value="spam">Spam or scam</option>
                            <option value="misinformation">Misinformation</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                )}

                {/* Info text */}
                <p className="mt-4 text-sm text-slate-400 mb-4">
                    {selectedAction === "block"
                        ? `${userName} won't be able to see you in room lists or contact you.`
                        : `We'll review this report and take action if needed.`}
                </p>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-lg border border-slate-600 px-4 py-2.5 font-semibold text-slate-300 hover:border-slate-500 hover:text-white transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            if (selectedAction === "block") {
                                onBlock();
                            } else {
                                onReport(reason);
                            }
                        }}
                        disabled={selectedAction === "report" && !reason}
                        className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isBlocking || isReporting ? "Processing..." : selectedAction === "block" ? "Block" : "Report"}
                    </button>
                </div>
            </div>
        </div>
    );
}
