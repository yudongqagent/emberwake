import { Component } from "preact";
import type { ComponentChildren } from "preact";
import { reportError } from "../../engine/errorReporting";

interface Props {
  children: ComponentChildren;
  /** Human-readable name of what this boundary wraps, used in the recovery message
   * and the console log — e.g. "Bridge", "Combat". */
  label: string;
}

interface State {
  error: Error | null;
}

/** Catches a render-phase throw in whatever it wraps and degrades gracefully instead
 * of white-screening the whole app — see docs/visual-standards.md and the incident
 * that prompted this: a single bad frame anywhere used to be able to take down the
 * entire game. Wrap each major screen/panel independently so one broken panel doesn't
 * take the others down with it. Does NOT catch errors thrown outside Preact's render
 * cycle (event listeners, setInterval/setTimeout callbacks) — those need their own
 * try/catch via safeCall(), since error boundaries only see render/lifecycle throws. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    reportError(`${this.props.label} (render)`, error);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="panel accent pop-in"
          style={{ margin: "1rem", padding: "1.25rem", textAlign: "center", ["--accent" as any]: "var(--red)" }}
        >
          <div className="title" style={{ color: "var(--red)", marginBottom: "0.5rem" }}>
            {this.props.label} glitched
          </div>
          <div style={{ color: "var(--text-mid)", fontSize: "0.85rem", marginBottom: "0.85rem" }}>
            Something unexpected happened here and recovered instead of freezing. Your progress is saved.
          </div>
          <button className="btn primary" onClick={() => this.setState({ error: null })}>
            Continue
          </button>
        </div>
      );
    }
    return this.props.children as any;
  }
}
