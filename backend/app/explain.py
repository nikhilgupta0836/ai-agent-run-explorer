import os
import asyncio
from typing import AsyncGenerator
from app.models import Run


class BaseExplainProvider:
    async def stream_explanation(self, run: Run) -> AsyncGenerator[str, None]:
        raise NotImplementedError


class MockExplainProvider(BaseExplainProvider):
    async def stream_explanation(self, run: Run) -> AsyncGenerator[str, None]:
        """
        Generate a deterministic, step-by-step natural language explanation
        and stream it in small chunks with artificial delay.
        """
        # Build explanation text based on run status and details
        header = f"Run Analysis for [{run.id}] ({run.agent} using {run.model}):\n\n"
        prompt_desc = f"• Prompt: \"{run.prompt.strip()}\"\n"
        status_desc = f"• Final Status: {run.status.upper()}\n"
        duration_desc = (
            f"• Total Duration: {run.duration_ms / 1000.0:.2f} seconds\n"
            if run.duration_ms is not None and run.duration_ms >= 0
            else "• Total Duration: N/A (Running or Invalid)\n"
        )
        tokens_desc = f"• Tokens Used: {run.input_tokens} input / {run.output_tokens} output\n\n"

        # Step breakdown
        if not run.steps:
            steps_desc = "Execution Details:\nNo execution steps were recorded for this run.\n"
        else:
            steps_desc = "Execution Details:\n"
            for step in run.steps:
                tool_info = f" via {step.tool}" if step.tool != "none" else ""
                dur_info = f" ({step.duration_ms}ms)" if step.duration_ms is not None else ""
                steps_desc += f"  [{step.index + 1}/{len(run.steps)}] Step '{step.name}' ({step.status}){tool_info}{dur_info}\n"

        # Error analysis if failed
        error_desc = ""
        if run.status == "failed" and run.error:
            step_location = (
                f"at step #{run.error.step_index + 1}"
                if run.error.step_index is not None and 0 <= run.error.step_index < len(run.steps)
                else "during initialization/post-processing"
            )
            error_desc = (
                f"\nDiagnosis / Failure Cause:\n"
                f"The run failed {step_location} with error type [{run.error.type}].\n"
                f"Message: \"{run.error.message}\"\n"
            )
        elif run.status == "succeeded":
            error_desc = "\nSummary: All steps completed successfully with valid output.\n"
        elif run.status == "cancelled":
            error_desc = "\nSummary: Execution was cancelled before completion.\n"
        elif run.status == "running":
            error_desc = "\nSummary: Execution is currently active.\n"

        full_text = header + prompt_desc + status_desc + duration_desc + tokens_desc + steps_desc + error_desc

        # Split into words/tokens and stream with small artificial delay
        words = full_text.split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield chunk
            await asyncio.sleep(0.04)  # 40ms delay per chunk for visible progressive text rendering


def get_explain_provider() -> BaseExplainProvider:
    provider_name = os.getenv("EXPLAIN_PROVIDER", "mock").lower()
    if provider_name == "mock":
        return MockExplainProvider()
    return MockExplainProvider()
