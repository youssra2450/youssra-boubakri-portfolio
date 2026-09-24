import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import UavTrajectoryLab from "@/features/project/uav/UavTrajectoryLab";

const REPOSITORY = "https://github.com/example/tsp-uav";

describe("UavTrajectoryLab", () => {
  it("renders the four algorithm tabs, the canvas and the comparison table", () => {
    render(<UavTrajectoryLab githubUrl={REPOSITORY} />);

    const tabs = within(screen.getByRole("tablist", { name: "Algorithm" })).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Random", "GWO", "Cuckoo Search", "Tabu Search"]);
    expect(screen.getByRole("tab", { name: "Tabu Search" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("img", { name: /Tabu Search tour over 14 nodes/ })).toBeInTheDocument();

    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(5); // header + 4 algorithms
    expect(screen.getByRole("status")).toHaveTextContent(/Tabu Search — 14 nodes, tour length \d+\.\d/);
  });

  it("switches algorithm with clicks and arrow keys", async () => {
    const user = userEvent.setup();
    render(<UavTrajectoryLab githubUrl={REPOSITORY} />);

    await user.click(screen.getByRole("tab", { name: "GWO" }));
    expect(screen.getByRole("tab", { name: "GWO" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("status")).toHaveTextContent(/Grey Wolf Optimizer — 14 nodes/);

    await user.keyboard("{ArrowRight}");
    const cuckoo = screen.getByRole("tab", { name: "Cuckoo Search" });
    expect(cuckoo).toHaveAttribute("aria-selected", "true");
    expect(cuckoo).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Random" })).toHaveAttribute("aria-selected", "true");
  });

  it("recomputes the instance when the node count changes", () => {
    render(<UavTrajectoryLab githubUrl={REPOSITORY} />);
    fireEvent.change(screen.getByLabelText("IoT nodes"), { target: { value: "20" } });
    expect(screen.getByRole("img", { name: /over 20 nodes/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/20 nodes/);
  });

  it("starts the flight animation when Run is pressed", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<UavTrajectoryLab githubUrl={REPOSITORY} />);
    await user.click(screen.getByRole("button", { name: "Run" }));
    expect(screen.getByRole("status")).toHaveTextContent("Flying the Tabu Search tour…");
    expect(screen.getByRole("button", { name: "Restart flight" })).toBeInTheDocument();
    unmount(); // cancels the pending animation frame
  });

  it("states that the demo is an illustrative re-implementation", () => {
    render(<UavTrajectoryLab githubUrl={REPOSITORY} />);
    expect(
      screen.getByText(/Illustrative re-implementation running live in your browser on a random instance/),
    ).toHaveTextContent(
      "Illustrative re-implementation running live in your browser on a random instance — not the original project's code or results. See the GitHub repository for the full implementation.",
    );
    expect(screen.getByRole("link", { name: "GitHub repository" })).toHaveAttribute("href", REPOSITORY);
  });
});
