import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

export const TableQueueCollection = new Mongo.Collection('TableQueue');

Meteor.methods({
  async 'tableQueue.insert'({ phone, name, adults, children, occasion, occasionNote, consent, visitorId, outletId, preferredTime }) {
    const guests = (adults || 0) + (children || 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await TableQueueCollection.find({
      createdAt: { $gte: todayStart },
      outletId: outletId || '',
    }).countAsync();

    return await TableQueueCollection.insertAsync({
      phone,
      name,
      adults: adults || 0,
      children: children || 0,
      guests,
      occasion: occasion || '',
      occasionNote: occasionNote || '',
      consent: !!consent,
      visitorId,
      outletId: outletId || '',
      preferredTime: preferredTime || '',
      token: todayCount + 1,
      status: 'waiting',
      createdAt: new Date(),
    });
  },

  async 'tableQueue.update'(id, fields) {
    return await TableQueueCollection.updateAsync(id, { $set: fields });
  },

  async 'tableQueue.remove'(id) {
    return await TableQueueCollection.removeAsync(id);
  },

  async 'tableQueue.promote'(id) {
    return await TableQueueCollection.updateAsync(id, { $set: { prioritized: true } });
  },

  async 'tableQueue.notify'(id) {
    return await TableQueueCollection.updateAsync(id, { $set: { notifiedAt: new Date() } });
  },

  async 'tableQueue.rate'(id, { rating, comment }) {
    return await TableQueueCollection.updateAsync(id, {
      $set: { rating, comment, ratedAt: new Date() },
    });
  },
});
