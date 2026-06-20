import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

export const OutletSettingsCollection = new Mongo.Collection('OutletSettings');

Meteor.methods({
  async 'outletSettings.addDisabledPeriod'({ outletId, from, to, reason }) {
    const periodId = Math.random().toString(36).slice(2, 10);
    await OutletSettingsCollection.upsertAsync(
      { outletId },
      {
        $push: {
          disabledPeriods: {
            id: periodId,
            from: new Date(from),
            to: new Date(to),
            reason: reason || '',
          },
        },
      }
    );
  },

  async 'outletSettings.removeDisabledPeriod'({ outletId, periodId }) {
    await OutletSettingsCollection.updateAsync(
      { outletId },
      { $pull: { disabledPeriods: { id: periodId } } }
    );
  },
});
