import { Link } from "@tanstack/react-router";

/** Text with clickable #hashtags and @mentions. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {text.split(/([#@][\p{L}\p{N}_.]+)/u).map((part, i) =>
        part.startsWith("#") && part.length > 1 ? (
          <Link key={i} to="/communities" search={{ tag: part.slice(1).toLowerCase() }} className="font-medium text-rind">{part}</Link>
        ) : part.startsWith("@") && part.length > 1 ? (
          <Link key={i} to="/u/$username" params={{ username: part.slice(1).replace(/\.$/, "").toLowerCase() }} className="font-medium text-melon">{part}</Link>
        ) : (
          part
        ),
      )}
    </p>
  );
}
