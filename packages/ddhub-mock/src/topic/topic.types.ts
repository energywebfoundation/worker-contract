export interface TopicMessage extends Object {
  id?: string;
  createdAt?: string;
}

export interface MockConfig {
  topics: {
    name: string;
    clientIds: string[]
  }[]
}
