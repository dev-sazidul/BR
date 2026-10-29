import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { RegisterForm } from "./RegisterForm";

describe("RegisterForm", () => {
  it("rejects passwords that do not match", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <MemoryRouter>
        <RegisterForm onSubmit={onSubmit} />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText("Full name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email address"), "ada@example.com");
    await user.type(
      screen.getByLabelText("Password (8 characters minimum)", { selector: "input" }),
      "a-distinct-passphrase",
    );
    await user.type(screen.getByLabelText("Confirm password"), "different-passphrase");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Passwords do not match.");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
