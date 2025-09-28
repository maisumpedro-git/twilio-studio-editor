export type TwilioWidgetTransition = {
  event: string;
  next?: string;
};

export type TwilioWidget = {
  name: string;
  type: string;
  transitions?: TwilioWidgetTransition[];
  properties?: Record<string, unknown>;
};

export type TwilioFlowDefinition = {
  sid?: string;
  friendly_name: string;
  status?: string;
  definition: {
    description?: string;
    initial_state?: string;
    states: TwilioWidget[];
  };
  commit_message?: string;
  valid?: boolean;
  date_created?: string;
  date_updated?: string;
};

export type FlowFile = {
  id: string;
  fileName: string;
  filePath: string;
  updatedAt: number;
  flow: TwilioFlowDefinition;
};

export type FlowSummary = {
  id: string;
  fileName: string;
  filePath: string;
  updatedAt: number;
  friendlyName: string;
  hasSid: boolean;
};

export type FlowSearchMatch = {
  fileId: string;
  fileName: string;
  widgetName?: string;
  widgetType?: string;
  matchedText: string;
  path: string;
  line: number;
  column: number;
  preview: string;
};
