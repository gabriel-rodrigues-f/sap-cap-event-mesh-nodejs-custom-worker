using {sample.poc as entities} from '../db/schema';

service PurchaseOrderService @(path: 'catalog') {
  entity Orders as projection on entities.Orders;
}
