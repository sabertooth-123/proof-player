interface RawLeanOutputProps {
  raw: string | undefined; // undefined: trace made before raw output was recorded (e.g. mock.json)
  line: number;
}

/** Lean's own trace_state text for the current step, unedited. The Goals view is parsed from this. */
export default function RawLeanOutput({ raw, line }: RawLeanOutputProps) {
  if (raw === undefined) {
    return <p className="raw-lean__caption">Raw Lean output isn't recorded in this trace. Run npm run traces.</p>;
  }

  return (
    <div className="raw-lean">
      <p className="raw-lean__caption">
        Printed by Lean's <code>trace_state</code> after line {line}, unedited:
      </p>
      <pre className="raw-lean__text">{raw === "" ? "(nothing: no goals left)" : raw}</pre>
    </div>
  );
}
