import { event$, Event } from './eventStream';

event$.subscribe((event) => {
  console.log('event', event);
});
