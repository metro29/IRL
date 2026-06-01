"use client";

import { feedback } from "@/lib/feedback/feedback";
import type { ActionResult } from "@/lib/actions/types";

export function toastActionResult<T>(
  result: ActionResult<T>,
  successTitle: string,
  successDescription?: string
): result is { success: true; data: T } {
  if (!result.success) {
    feedback.error("Something went wrong", result.error);
    return false;
  }
  feedback.success(successTitle, successDescription);
  return true;
}
