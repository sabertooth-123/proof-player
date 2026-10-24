import { Component, type ReactNode } from "react";

interface Props {
  name: string; // shown in the fallback, e.g. "goal panel"
  resetKey: string; // when it changes (another step or proof), try rendering again
  children: ReactNode;
}

/** Keeps one panel's failure from blanking the whole player. */
export default class PanelBoundary extends Component<Props, { failed: boolean; key: string }> {
  state = { failed: false, key: this.props.resetKey };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: { failed: boolean; key: string }) {
    return props.resetKey === state.key ? null : { failed: false, key: props.resetKey };
  }

  componentDidCatch(error: unknown) {
    console.error(`Proof Player: the ${this.props.name} failed to render this step`, error);
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="panel-error" role="status">
          The {this.props.name} couldn't show this step. The other panels and Show raw Lean output still work.
        </p>
      );
    }
    return this.props.children;
  }
}
