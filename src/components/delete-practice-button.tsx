"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deletePastPractice } from "@/app/actions";

function DeleteButton({ meetingTitle }: { meetingTitle: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="practice-delete-button"
      disabled={pending}
      aria-label={`Delete ${meetingTitle}`}
    >
      <Trash2 size={16} aria-hidden="true" />
      <span>{pending ? "Deleting…" : "Delete meeting"}</span>
    </button>
  );
}

export function DeletePracticeButton({ id, meetingTitle }: { id: string; meetingTitle: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        className="practice-delete-button"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${meetingTitle}`}
      >
        <Trash2 size={16} aria-hidden="true" />
        <span>Delete</span>
      </button>
    );
  }

  return (
    <form action={deletePastPractice} className="practice-delete-confirm">
      <input type="hidden" name="id" value={id} />
      <DeleteButton meetingTitle={meetingTitle} />
      <button type="button" className="practice-delete-cancel" onClick={() => setConfirming(false)}>Cancel</button>
    </form>
  );
}
