jest.mock('../models/Subscription', () => ({ find: jest.fn() }));
jest.mock('../models/Transactions', () => ({ find: jest.fn() }));

const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transactions');
const { detectSubscriptions } = require('../controllers/subscriptionController');

const leanResult = (value) => ({
    sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(value) }),
    lean: jest.fn().mockResolvedValue(value)
});

const monthlyCharges = (description) => [
    { description, category: 'entertainment', amount: 199, date: new Date('2026-07-05') },
    { description, category: 'entertainment', amount: 199, date: new Date('2026-08-05') },
    { description, category: 'entertainment', amount: 199, date: new Date('2026-09-05') }
];

const run = async (transactions, subscriptions) => {
    Transaction.find.mockReturnValue(leanResult(transactions));
    Subscription.find.mockReturnValue(leanResult(subscriptions));
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await detectSubscriptions({ userId: 'user-1' }, res);
    return res.json.mock.calls[0][0];
};

describe('detectSubscriptions', () => {
    it('does not suggest a subscription the user already tracks under a shorter name', async () => {
        const body = await run(monthlyCharges('Netflix subscription'), [{ name: 'Netflix' }]);

        expect(body.success).toBe(true);
        expect(body.candidates).toEqual([]);
    });

    it('does not suggest a subscription saved under a longer name', async () => {
        const body = await run(monthlyCharges('Spotify'), [{ name: 'Spotify Premium' }]);

        expect(body.candidates).toEqual([]);
    });

    it('still suggests recurring charges that are not tracked yet', async () => {
        const body = await run(monthlyCharges('Spotify'), [{ name: 'Netflix' }]);

        expect(body.candidates).toHaveLength(1);
        expect(body.candidates[0].name).toBe('Spotify');
    });
});
