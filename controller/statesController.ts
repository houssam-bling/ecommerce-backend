import { type NextFunction, type Request, type Response} from 'express';
import { orderModel } from '../model/order.ts';
import { userModel } from '../model/user.ts';

export const getStats = async (req: Request, res: Response, next: NextFunction) => {

  const { fromDate, endDate } = req.query as { 
    fromDate?: string; 
    endDate?: string; 
  };

  let matchFilter: any = {};

  if (fromDate) {
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0); 
    matchFilter.createdAt = { ...matchFilter.createdAt, $gte: start };
  } else {
    matchFilter.createdAt = { ...matchFilter.createdAt, $gte: new Date(0) };
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); 
    matchFilter.createdAt = { ...matchFilter.createdAt, $lte: end };
  } else {
    matchFilter.createdAt = { ...matchFilter.createdAt, $lte: new Date() };
  }

  try
  {
    const statsData = await orderModel.aggregate([
        { $match: matchFilter },

        {$facet: {
          stats: [{ $group: { _id: null, totalOrders: { $sum: 1 },averagePrice: { $avg: '$totalPrice' }, totalRevenue: { $sum: '$totalPrice' } } }],
          orderStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          recentOrders: [{ $sort: { createdAt: -1 } }, { $limit: 5 }]
        },
    }]);

    const userData = await userModel.aggregate([
      { $match: matchFilter },
      { $group: { _id: null, totalUsers: { $sum: 1 } } }
    ]);      
    res.status(200).json({ 
    states: statsData[0].stats[0] || { count: 0, avgPrice: 0, totalRevenue: 0 },
    orderStatus: statsData[0].orderStatus || [],
    recentOrders: statsData[0].recentOrders || [],
    userData: userData[0] || { totalUsers: 0 }
  });

  }
  catch (error)
  {
    next(error);
  }
};
