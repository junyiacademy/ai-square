import React from "react";
import { render, screen } from "@testing-library/react";
import {
  getByTextInContainer,
  getByTextInRole,
  getStatisticByLabel,
  elementExists,
  expectElementCountInContainer,
  getByTextWithContext,
  hasClass,
  getComputedStyleProperty,
  waitForElementWithTimeout,
} from "../queries";

describe("test-utils/helpers/queries", () => {
  it("getByTextInContainer and expectElementCountInContainer work with data-testid", () => {
    render(
      <div>
        <section data-testid="stats">
          <div>Users</div>
          <div>Users</div>
          <div>Admins</div>
        </section>
      </div>,
    );

    const el = getByTextInContainer("stats", "Admins");
    expect(el).toBeInTheDocument();
    const elements = expectElementCountInContainer("stats", "Users", 2);
    expect(elements.length).toBe(2);
  });

  it("getByTextInRole works and getByTextWithContext disambiguates by context", () => {
    render(
      <div>
        <div role="group" aria-label="A">
          <span>Label</span>
        </div>
        <div role="group" aria-label="B">
          <span>Label</span>
          <span>Context</span>
        </div>
      </div>,
    );

    expect(
      getByTextInRole("group", "Label", { name: "A" }),
    ).toBeInTheDocument();
    expect(getByTextWithContext("Label", "Context")).toBeInTheDocument();
  });

  it("getStatisticByLabel finds adjacent value element", () => {
    render(
      <div className="text-center">
        <div className="text-3xl">42</div>
        <div>Score</div>
      </div>,
    );
    const value = getStatisticByLabel("Score");
    expect(value).toHaveTextContent("42");
  });

  it("elementExists, hasClass, and getComputedStyleProperty behave correctly", () => {
    render(
      <div>
        <span className="foo" style={{ color: "rgb(255, 0, 0)" }}>
          Hello
        </span>
      </div>,
    );
    expect(elementExists("Hello")).toBe(true);
    const el = screen.getByText("Hello");
    expect(hasClass(el, "foo")).toBe(true);
    expect(getComputedStyleProperty(el as HTMLElement, "color")).toBe(
      "rgb(255, 0, 0)",
    );
  });

  it("waitForElementWithTimeout resolves when element appears", async () => {
    const Test = () => {
      const [show, setShow] = React.useState(false);
      React.useEffect(() => {
        const id = setTimeout(() => setShow(true), 10);
        return () => clearTimeout(id);
      }, []);
      return <div>{show ? <span data-testid="late">Ready</span> : null}</div>;
    };
    render(<Test />);
    const el = await waitForElementWithTimeout(
      () => screen.queryByTestId("late"),
      200,
    );
    expect(el).toBeInTheDocument();
  });

  it("waitForElementWithTimeout throws on timeout", async () => {
    render(<div />);
    await expect(
      waitForElementWithTimeout(() => screen.queryByTestId("never"), 50),
    ).rejects.toThrow("Element not found");
  });
});
