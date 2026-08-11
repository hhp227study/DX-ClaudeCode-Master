import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Dropzone,
  FileItem,
  type DropzoneState,
  type FileItemStatus,
} from "../../components/ui/file-uploader";

/**
 * design.pen `Components/FileUploader` 핸드오프.
 * Dropzone: Default/Dragover/Disabled/Error, FileItem: Uploading/Complete/Error.
 */
const meta = {
  title: "Components/FileUploader",
  component: Dropzone,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    state: "default",
    guideText: "사진을 여기에 끌어다 놓아주세요",
    browseLabel: "파일 선택",
  },
  argTypes: {
    state: { control: "select", options: ["default", "dragover", "disabled", "error"] },
  },
} satisfies Meta<typeof Dropzone>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Dragover: Story = { args: { state: "dragover" } };
export const Disabled: Story = { args: { state: "disabled" } };
export const Error: Story = { args: { state: "error" } };

const DROPZONE_STATES: DropzoneState[] = ["default", "dragover", "disabled", "error"];
const ITEM_STATUSES: FileItemStatus[] = ["uploading", "complete", "error"];

/** pen 스펙 매트릭스 — Dropzone 상태 4종 */
export const DropzoneMatrix: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
      {DROPZONE_STATES.map((state) => (
        <div key={state} style={{ display: "grid", gap: 6 }}>
          <span
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: 12,
              letterSpacing: -0.24,
              color: "var(--muted-foreground)",
            }}
          >
            PNG, JPG 10MB까지
          </span>
          <Dropzone state={state} />
        </div>
      ))}
    </div>
  ),
};

/** pen 스펙 매트릭스 — FileItem 상태 3종 */
export const FileItemMatrix: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <FileItem status="uploading" fileName="kalguksu_01.jpg" statusText="업로드 중... 45%" />
      <FileItem status="complete" fileName="kalguksu_01.jpg" />
      <FileItem status="error" fileName="kalguksu_02.jpg" />
    </div>
  ),
};

/** 등록 페이지 사용 예 — Dropzone + 업로드 목록 */
export const Usage: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 8, width: 300 }}>
      <Dropzone fullWidth />
      {ITEM_STATUSES.map((status) => (
        <FileItem key={status} status={status} fileName={`kalguksu_0${ITEM_STATUSES.indexOf(status) + 1}.jpg`} fullWidth />
      ))}
    </div>
  ),
};
