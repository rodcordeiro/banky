declare global {
  export type RabbitMessage = {
    type: 'notification';
    title: string;
    description: string;
  };
}
export {};
