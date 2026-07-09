import * as api from './api';

// Definition of each tool mapping to OpenAI function calling schema
export const aiTools = [
  {
    type: 'function',
    function: {
      name: 'search_items',
      description: 'Search for items in the inventory. Use this to find item IDs, prices, or basic details.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'The search query (name or SKU)' }
        },
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_stock_overview',
      description: 'Get the current stock levels for all items in a branch. Returns current_qty and min_stock.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'adjust_stock',
      description: 'Adjust the stock quantity of a specific item.',
      parameters: {
        type: 'object',
        properties: {
          item_id: { type: 'string' },
          unit_id: { type: 'string', description: 'The unit ID for the item. Use the base_unit_id from search_items if unsure.' },
          qty: { type: 'number', description: 'The amount to adjust (must be positive)' },
          direction: { type: 'string', enum: ['in', 'out'], description: 'Whether stock is coming in (added) or out (removed)' },
          notes: { type: 'string', description: 'Reason for adjustment' }
        },
        required: ['item_id', 'unit_id', 'qty', 'direction']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_item_retail_price',
      description: 'Update the retail price (harga eceran) for an item for a specific tier (regular, member, vip).',
      parameters: {
        type: 'object',
        properties: {
          item_id: { type: 'string' },
          unit_id: { type: 'string' },
          customer_tier: { type: 'string', enum: ['regular', 'member', 'vip'], description: 'Usually regular' },
          price: { type: 'number', description: 'The new price' }
        },
        required: ['item_id', 'unit_id', 'customer_tier', 'price']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_item_wholesale_price',
      description: 'Update the wholesale price (harga grosir) for an item.',
      parameters: {
        type: 'object',
        properties: {
          item_id: { type: 'string' },
          price: { type: 'number', description: 'The new wholesale price' }
        },
        required: ['item_id', 'price']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_sales_summary',
      description: 'Get a summary of sales between two dates.',
      parameters: {
        type: 'object',
        properties: {
          date_from: { type: 'string', description: 'YYYY-MM-DD' },
          date_to: { type: 'string', description: 'YYYY-MM-DD' }
        },
        required: ['date_from', 'date_to']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_promo',
      description: 'Create a new discount promotion. Can be fixed_amount or percentage.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the promo' },
          promo_type: { type: 'string', enum: ['percentage', 'fixed_amount'] },
          min_qty: { type: 'number', description: 'Minimum quantity to trigger the promo' },
          discount_percent: { type: 'number', description: 'If type is percentage, the percent discount (0-100)' },
          discount_value: { type: 'number', description: 'If type is fixed_amount, the exact Rp amount to discount' },
          item_id: { type: 'string', description: 'The item ID this promo applies to (if applies_to is item)' },
          applies_to: { type: 'string', enum: ['item', 'cart'] }
        },
        required: ['name', 'promo_type', 'min_qty', 'applies_to']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_customer',
      description: 'Add a new customer (member).',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          customer_tier: { type: 'string', enum: ['regular', 'member', 'vip'], description: 'Default is regular' }
        },
        required: ['name', 'customer_tier']
      }
    }
  }
];

export const TOOL_ROLE_REQUIREMENTS: Record<string, string[]> = {
  search_items: ['owner', 'admin', 'staff'],
  get_stock_overview: ['owner', 'admin', 'staff'],
  adjust_stock: ['owner', 'admin'],
  update_item_retail_price: ['owner', 'admin'],
  update_item_wholesale_price: ['owner', 'admin'],
  get_sales_summary: ['owner', 'admin'],
  create_promo: ['owner', 'admin'],
  add_customer: ['owner', 'admin', 'staff']
};

export async function executeTool(name: string, args: any, context: { branchId: string; userId: string; role: string }) {
  // Enforce roles
  const allowedRoles = TOOL_ROLE_REQUIREMENTS[name];
  if (!allowedRoles || !allowedRoles.includes(context.role)) {
    return { error: `Permission Denied. User role '${context.role}' is not allowed to use tool '${name}'. Requires one of: ${allowedRoles?.join(', ')}.` };
  }

  try {
    switch (name) {
      case 'search_items':
        return await api.getItemsFiltered(args.search || '', '', '', false, 1, 20);
      case 'get_stock_overview':
        return await api.getStockOverview(context.branchId);
      case 'adjust_stock':
        return await api.adjustStock(args.item_id, args.unit_id, context.branchId, args.qty, args.direction, args.notes, context.userId);
      case 'update_item_retail_price':
        return await api.setItemPrice(args.item_id, args.unit_id, args.customer_tier, args.price);
      case 'update_item_wholesale_price':
        return await api.updateItemWholesalePrice(args.item_id, args.price);
      case 'get_sales_summary':
        return await api.getSalesSummary(context.branchId, args.date_from, args.date_to);
      case 'create_promo':
        return await api.createPromo({
          name: args.name,
          promo_type: args.promo_type,
          min_qty: args.min_qty,
          discount_percent: args.discount_percent || 0,
          discount_value: args.discount_value || 0,
          applies_to: args.applies_to,
          item_id: args.item_id,
          member_only: 0,
          stack_rule: 'best_only',
          priority: 0,
          bogo_rules: [],
          tiers: []
        });
      case 'add_customer':
        return await api.addCustomer(args.name, args.phone, undefined, undefined, undefined, args.customer_tier);
      default:
        return { error: `Tool ${name} not implemented.` };
    }
  } catch (err: any) {
    return { error: err.toString() };
  }
}
