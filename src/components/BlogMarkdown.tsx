import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";

const components: Components = {
  h1: (props) => <h2 {...props} />,
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={className ? `about-pullquote ${className}` : "about-pullquote"}
      {...props}
    />
  ),
};

/** Renders a post body. Links stay anchors; the page title is the only h1. */
export function BlogMarkdown({ source }: { source: string }) {
  return <ReactMarkdown components={components}>{source}</ReactMarkdown>;
}
