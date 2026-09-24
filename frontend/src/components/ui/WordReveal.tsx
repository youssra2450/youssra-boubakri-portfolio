import { Fragment, type CSSProperties } from "react";

import { splitWords } from "@/lib/motion";

interface WordRevealProps {
  text: string;
  /** Index of the first word (continues a stagger started by a previous WordReveal). */
  offset?: number;
}

/**
 * Text split into words, each rising out of its own mask. The animation itself is driven by
 * CSS (`.heading-reveal` for scroll reveals, `.hero-name` for the page-load entrance); the
 * words stay plain text nodes separated by spaces, so the accessible name is unchanged.
 */
export function WordReveal({ text, offset = 0 }: WordRevealProps) {
  const words = splitWords(text);
  return (
    <>
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          {index > 0 && " "}
          <span className="word-mask">
            <span className="word-mask__inner" style={{ "--w": offset + index } as CSSProperties}>
              {word}
            </span>
          </span>
        </Fragment>
      ))}
    </>
  );
}
