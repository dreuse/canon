import { Suspense, useCallback, useMemo } from "react";
import styled from "styled-components";
import type { EmbedProps } from "@shared/editor/embeds";
import { richExtensions } from "@shared/editor/nodes";
import { s } from "@shared/styles";
import { toError } from "@shared/utils/error";
import Editor from "~/components/Editor";
import useRequest from "~/hooks/useRequest";
import { client } from "~/utils/ApiClient";
import { GitHubUtils } from "../../shared/GitHubUtils";

const MAX_EMBED_HEIGHT = 480;

interface GitHubFile {
  path: string;
  language: string;
  content: string;
  url: string;
}

/**
 * Renders the current content of a GitHub repository file, or the README of
 * a repository.
 *
 * @param props the embed props.
 * @returns the rendered file.
 */
export function GitHubFileEmbed({ attrs }: EmbedProps) {
  const { href } = attrs;
  const fetchFile = useCallback(
    async () =>
      (
        await client.post<{ data: GitHubFile }>("/github.content", {
          url: href,
        })
      ).data,
    [href]
  );
  const { data: file, error } = useRequest(fetchFile, true);
  const markdown = useMemo(
    () =>
      file &&
      GitHubUtils.fileMarkdown(
        file,
        GitHubUtils.parseCodePermalink(new URL(href))
      ),
    [file, href]
  );

  return (
    <Container>
      <Header>
        <a href={file?.url ?? href} target="_blank" rel="noopener noreferrer">
          {file?.path ?? href}
        </a>
        {error ? <ErrorText>{toError(error).message}</ErrorText> : null}
      </Header>
      {markdown ? (
        <Body>
          <Suspense fallback={null}>
            <Editor
              extensions={richExtensions}
              defaultValue={markdown}
              embedsDisabled
              readOnly
            />
          </Suspense>
        </Body>
      ) : null}
    </Container>
  );
}

const Container = styled.div`
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  line-height: normal;
  white-space: normal;
  user-select: text;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 1px solid ${s("divider")};
  color: ${s("textSecondary")};
`;

const ErrorText = styled.span`
  color: ${s("danger")};
`;

const Body = styled.div`
  max-height: ${MAX_EMBED_HEIGHT}px;
  overflow: auto;
  padding: 0 12px;
`;
