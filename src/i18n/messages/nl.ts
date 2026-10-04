import type { Messages } from "./en";
import { admin } from "./parts/admin";
import { clients } from "./parts/clients";
import { errors } from "./parts/errors";
import { quick } from "./parts/quick";
import { detail } from "./parts/detail";
import { records } from "./parts/records";
import { sections } from "./parts/sections";
import { common } from "./parts/common";
import { dashboard } from "./parts/dashboard";
import { labels } from "./parts/labels";
import { shell } from "./parts/shell";

export const nl: Messages = {
  ...common.nl,
  ...shell.nl,
  ...labels.nl,
  ...dashboard.nl,
  ...clients.nl,
  ...detail.nl,
  ...records.nl,
  ...sections.nl,
  ...admin.nl,
  ...errors.nl,
  ...quick.nl,
};
