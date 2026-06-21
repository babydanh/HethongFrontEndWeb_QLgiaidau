'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ToolConstructable } from '@editorjs/editorjs';
import { uploadApi } from '@/features/upload/api';

interface RichTextEditorProps {
  value: string;
  onChange: (data: string) => void;
  placeholder?: string;
  error?: string;
  label?: string;
  disabled?: boolean;
}

interface EditorJSBlock {
  type: string;
  data: {
    text?: string;
    level?: number;
    style?: 'ordered' | 'unordered';
    items?: Array<{ content: string; items: unknown[] } | string>;
    file?: {
      url: string;
    };
    caption?: string;
    withBorder?: boolean;
    withBackground?: boolean;
    stretched?: boolean;
  };
}

interface EditorJSData {
  blocks: EditorJSBlock[];
}

// Convert HTML string to Editor.js JSON block structure
const htmlToEditorjs = (html: string): EditorJSData => {
  if (!html) return { blocks: [] };
  
  if (!html.includes('<p>') && !html.includes('<h') && !html.includes('<ul') && !html.includes('<ol') && !html.includes('<figure') && !html.includes('<img')) {
    return {
      blocks: [
        {
          type: 'paragraph',
          data: {
            text: html
          }
        }
      ]
    };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const blocks: EditorJSBlock[] = [];

    doc.body.childNodes.forEach((node: ChildNode) => {
      if (node.nodeType !== 1) return; // Node.ELEMENT_NODE
      const element = node as Element;

      const tagName = element.tagName.toLowerCase();
      if (tagName.startsWith('h')) {
        const level = parseInt(tagName.substring(1)) || 2;
        blocks.push({
          type: 'header',
          data: {
            text: element.innerHTML,
            level: level
          }
        });
      } else if (tagName === 'p') {
        blocks.push({
          type: 'paragraph',
          data: {
            text: element.innerHTML
          }
        });
      } else if (tagName === 'ul' || tagName === 'ol') {
        const items = Array.from(element.querySelectorAll('li')).map((li: Element) => {
          return {
            content: li.innerHTML,
            items: []
          };
        });
        blocks.push({
          type: 'list',
          data: {
            style: tagName === 'ol' ? 'ordered' : 'unordered',
            items: items
          }
        });
      } else if (tagName === 'figure') {
        const img = element.querySelector('img');
        const figcaption = element.querySelector('figcaption');
        if (img) {
          blocks.push({
            type: 'image',
            data: {
              file: {
                url: img.src
              },
              caption: figcaption ? figcaption.innerHTML : '',
              withBorder: false,
              withBackground: false,
              stretched: false
            }
          });
        }
      } else if (tagName === 'img') {
        const img = element as HTMLImageElement;
        blocks.push({
          type: 'image',
          data: {
            file: {
              url: img.src
            },
            caption: '',
            withBorder: false,
            withBackground: false,
            stretched: false
          }
        });
      }
    });

    return { blocks };
  } catch (e) {
    console.error('Failed to parse HTML to EditorJS blocks', e);
    return {
      blocks: [
        {
          type: 'paragraph',
          data: {
            text: html
          }
        }
      ]
    };
  }
};

// Convert Editor.js JSON block structure to HTML string
const editorjsToHtml = (data: EditorJSData): string => {
  if (!data || !data.blocks) return '';
  return data.blocks.map((block: EditorJSBlock) => {
    switch (block.type) {
      case 'header':
        return `<h${block.data.level}>${block.data.text}</h${block.data.level}>`;
      case 'paragraph':
        return `<p>${block.data.text}</p>`;
      case 'list': {
        const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
        if (!block.data.items) return `<${tag}></${tag}>`;
        const items = block.data.items.map((item: { content: string; items: unknown[] } | string) => {
          if (typeof item === 'object' && item !== null) {
            return `<li>${item.content || ''}</li>`;
          }
          return `<li>${item}</li>`;
        }).join('');
        return `<${tag}>${items}</${tag}>`;
      }
      case 'image': {
        const caption = block.data.caption || '';
        return `<figure><img src="${block.data.file?.url || ''}" alt="${caption}" />${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
      }
      default:
        return '';
    }
  }).join('\n');
};

interface EditorJSUploaderResponse {
  success: number;
  file?: {
    url: string;
  };
  message?: string;
}

interface EditorJSAPI {
  saver: {
    save: () => Promise<EditorJSData>;
  };
}

export default function RichTextEditor({ value, onChange, placeholder, error, label, disabled }: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const valueRef = useRef(value);

  // Keep valueRef updated to prevent closure stale values
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    // Delay state update to the next microtask/frame to comply with React 19 rules
    Promise.resolve().then(() => {
      setIsMounted(true);
    });
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    let editorInstance: { destroy?: () => void } | null = null;

    // Load Editor.js dynamically
    Promise.all([
      import('@editorjs/editorjs'),
      import('@editorjs/header'),
      import('@editorjs/list'),
      import('@editorjs/image')
    ]).then(([EditorJS, Header, List, Image]) => {
      if (!containerRef.current) return;

      const initialData = htmlToEditorjs(valueRef.current);

      editorInstance = new EditorJS.default({
        holder: containerRef.current,
        data: initialData,
        readOnly: disabled,
        placeholder: placeholder || 'Nhấn Tab để bắt đầu viết...',
        tools: {
          header: {
            class: Header.default as unknown as ToolConstructable,
            inlineToolbar: ['link', 'bold', 'italic'],
            config: {
              placeholder: 'Nhập tiêu đề...',
              levels: [1, 2, 3, 4],
              defaultLevel: 2
            }
          },
          list: {
            class: List.default as unknown as ToolConstructable,
            inlineToolbar: true,
            config: {
              defaultStyle: 'unordered'
            }
          },
          image: {
            class: Image.default as unknown as ToolConstructable,
            config: {
              uploader: {
                uploadByFile(file: File): Promise<EditorJSUploaderResponse> {
                  return uploadApi.uploadImage(file).then((res: { url: string; publicId: string }) => {
                    return {
                      success: 1,
                      file: {
                        url: res.url,
                      }
                    };
                  }).catch((err: unknown) => {
                    console.error('Upload error', err);
                    return {
                      success: 0,
                      message: 'Lỗi tải ảnh lên Cloudinary'
                    };
                  });
                },
                uploadByUrl(url: string): Promise<EditorJSUploaderResponse> {
                  return Promise.resolve({
                    success: 1,
                    file: {
                      url: url
                    }
                  });
                }
              }
            }
          }
        },
        // Vietnamese Translations
        i18n: {
          messages: {
            ui: {
              "blockTunes": {
                "toggler": {
                  "Click to tune": "Nhấp để thiết lập",
                  "or drag to move": "hoặc kéo để di chuyển"
                }
              },
              "inlineToolbar": {
                "converter": {
                  "Convert to": "Chuyển đổi thành"
                }
              },
              "toolbar": {
                "toolbox": {
                  "Add": "Thêm khối"
                }
              }
            },
            toolNames: {
              "Text": "Văn bản",
              "Heading": "Tiêu đề",
              "List": "Danh sách",
              "Image": "Hình ảnh",
              "Link": "Liên kết",
              "Bold": "In đậm",
              "Italic": "In nghiêng"
            },
            tools: {
              "link": {
                "Add a link": "Thêm liên kết"
              },
              "image": {
                "Select an Image": "Chọn một hình ảnh từ thiết bị",
                "Select file": "Chọn tệp",
                "File": "Tệp",
                "Caption": "Chú thích ảnh"
              }
            }
          }
        },
        async onChange(api: EditorJSAPI) {
          const savedData = await api.saver.save();
          const htmlOutput = editorjsToHtml(savedData);
          onChange(htmlOutput);
        }
      });
    }).catch((err: unknown) => {
      console.error('Failed to init Editor.js', err);
    });

    return () => {
      if (editorInstance && typeof editorInstance.destroy === 'function') {
        editorInstance.destroy();
      }
    };
  }, [isMounted, disabled]);

  if (!isMounted) {
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
        <div className="h-28 w-full bg-slate-100 rounded-lg animate-pulse border border-slate-200 flex items-center justify-center text-xs text-slate-400">
          Đang tải trình soạn thảo văn bản...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
      <div 
        onClick={() => setIsFocused(true)}
        onBlur={(e) => {
          // Check if the focus goes outside the editor wrapper
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsFocused(false);
          }
        }}
        className={`w-full bg-white border border-slate-300 rounded-xl px-4 py-3 transition-all duration-300 ${
          isFocused 
            ? 'ring-2 ring-blue-500/20 border-blue-500 shadow-sm min-h-[300px]' 
            : 'hover:border-slate-400 min-h-[140px]'
        }`}
      >
        <div ref={containerRef} className="prose prose-slate max-w-none text-slate-800 text-sm editorjs-container" />
      </div>
      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

      <style jsx global>{`
        .editorjs-container .codex-editor__redactor {
          padding-bottom: 20px !important;
          min-height: 100px;
        }
        .editorjs-container .ce-block {
          margin-bottom: 8px;
        }
        .editorjs-container h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-top: 12px;
          margin-bottom: 6px;
        }
        .editorjs-container p {
          margin: 4px 0;
          line-height: 1.6;
        }
        .editorjs-container ul {
          list-style-type: disc;
          padding-left: 20px;
        }
        .editorjs-container ol {
          list-style-type: decimal;
          padding-left: 20px;
        }
        .editorjs-container img {
          max-width: 100%;
          border-radius: 8px;
          margin-top: 8px;
        }
        .editorjs-container figure {
          margin: 12px 0;
        }
        .editorjs-container figcaption {
          font-size: 0.75rem;
          color: #64748b;
          text-align: center;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
