import { admin } from "./parts/admin";
import { clients } from "./parts/clients";
import { errors } from "./parts/errors";
import { detail } from "./parts/detail";
import { records } from "./parts/records";
import { sections } from "./parts/sections";
import { common } from "./parts/common";
import { dashboard } from "./parts/dashboard";
import { labels } from "./parts/labels";
import { shell } from "./parts/shell";

export const en = {
  ...common.en,
  ...shell.en,
  ...labels.en,
  ...dashboard.en,
  ...clients.en,
  ...detail.en,
  ...records.en,
  ...sections.en,
  ...admin.en,
  ...errors.en,
};

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
