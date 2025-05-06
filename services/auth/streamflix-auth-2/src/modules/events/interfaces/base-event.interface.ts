export interface BaseEvent {
  id: string;
  type: string;
  timestamp: Date;
  version: string;
  producer: string;
}
