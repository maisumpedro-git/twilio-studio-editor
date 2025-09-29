import { useState, useMemo, MouseEvent } from "react";
import clsx from "clsx";

export type TreeNode = {
  name: string;
  path: string; // relative path for folders/files
  children?: TreeNode[];
  filePath?: string; // absolute path for file leaf
};

export function buildTree(paths: Array<{ fileName: string; filePath: string }>): TreeNode[] {
  const root: Record<string, any> = {};
  for (const p of paths) {
    const parts = p.fileName.split(/[\\/]/g).filter(Boolean);
    let cursor = root;
    let acc = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      acc = acc ? `${acc}/${part}` : part;
      cursor.children = cursor.children || {};
      cursor.children[part] = cursor.children[part] || { name: part, path: acc };
      if (i === parts.length - 1) {
        cursor.children[part].filePath = p.filePath;
      }
      cursor = cursor.children[part];
    }
  }
  const toArray = (node: any): TreeNode[] => {
    const children = node.children || {};
    return Object.keys(children)
      .sort((a, b) => a.localeCompare(b))
      .map((k) => {
        const child = children[k];
        const childArr = toArray(child);
        return {
          name: child.name,
          path: child.path,
          children: childArr.length ? childArr : undefined,
          filePath: child.filePath
        } as TreeNode;
      });
  };
  return toArray(root);
}

type TreeViewProps = {
  nodes: TreeNode[];
  activeFileId?: string;
  onOpenFile: (filePath: string) => void;
  onOpenInNewTab?: (filePath: string) => void;
};

export const TreeView = ({ nodes, activeFileId, onOpenFile, onOpenInNewTab }: TreeViewProps) => {
  return (
    <ul className="space-y-1">
      {nodes.map((n) => (
        <TreeItem
          key={n.path}
          node={n}
          depth={0}
          activeFileId={activeFileId}
          onOpenFile={onOpenFile}
          onOpenInNewTab={onOpenInNewTab}
        />
      ))}
    </ul>
  );
};

const TreeItem = ({
  node,
  depth,
  activeFileId,
  onOpenFile,
  onOpenInNewTab
}: {
  node: TreeNode;
  depth: number;
  activeFileId?: string;
  onOpenFile: (filePath: string) => void;
  onOpenInNewTab?: (filePath: string) => void;
}) => {
  const [expanded, setExpanded] = useState(true);
  const isLeaf = !node.children || node.children.length === 0;
  const isActive = node.filePath && activeFileId === node.filePath;
  const paddingLeft = 8 + depth * 12;

  const handleClick = () => {
    if (isLeaf && node.filePath) onOpenFile(node.filePath);
    else setExpanded((e) => !e);
  };
  const handleDoubleClick = (e: MouseEvent) => {
    if (isLeaf && node.filePath) {
      e.stopPropagation();
      onOpenInNewTab?.(node.filePath);
    }
  };

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={clsx(
          "flex select-none items-center gap-2 rounded px-2 py-1 text-sm",
          isActive ? "bg-surface-600/40 text-slate-50" : "text-slate-300 hover:bg-slate-800/80"
        )}
        style={{ paddingLeft }}
      >
        {isLeaf ? (
          <span className="text-slate-500">●</span>
        ) : (
          <span className="text-slate-500">{expanded ? "▼" : "▶"}</span>
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {!isLeaf && expanded ? (
        <ul className="space-y-1">
          {node.children!.map((c) => (
            <TreeItem
              key={c.path}
              node={c}
              depth={depth + 1}
              activeFileId={activeFileId}
              onOpenFile={onOpenFile}
              onOpenInNewTab={onOpenInNewTab}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
};
