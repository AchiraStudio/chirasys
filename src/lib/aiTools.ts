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
          notes: { type: 'string', description: 'Reason for adjustment' },
          batch_no: { type: 'string', description: 'Batch number, if provided by user' },
          expiry_date: { type: 'string', description: 'Expiration date YYYY-MM-DD, if provided by user' }
        },
        required: ['item_id', 'unit_id', 'qty', 'direction']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'bulk_stock_opname',
      description: 'Perform a bulk stock adjustment (stock opname) for multiple items at once. Best used when user gives a list of items to adjust.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'List of items to adjust',
            items: {
              type: 'object',
              properties: {
                item_id: { type: 'string' },
                unit_id: { type: 'string' },
                actual_qty: { type: 'number', description: 'The actual physical quantity counted' },
                hpp_value: { type: 'number', description: 'Optional new cost (HPP)' },
                batch_no: { type: 'string', description: 'Optional batch number' },
                expiry_date: { type: 'string', description: 'Optional expiry date (YYYY-MM-DD)' },
                notes: { type: 'string', description: 'Optional reasoning' }
              },
              required: ['item_id', 'unit_id', 'actual_qty']
            }
          }
        },
        required: ['items']
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
      description: 'Create a new discount promotion. Types: percentage, fixed_amount, bogo, tiered, bundle. For BUNDLE: set promo_type=bundle, applies_to=item, provide bundle_items array with item_id+qty pairs, and set discount_percent or discount_value. Do NOT set item_id for bundles.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the promo' },
          promo_type: { type: 'string', enum: ['percentage', 'fixed_amount', 'bogo', 'tiered', 'bundle'] },
          min_qty: { type: 'number', description: 'Minimum quantity to trigger the promo (default 1)' },
          discount_percent: { type: 'number', description: 'Percent discount (0-100). Use for percentage promos or bundle with percent discount.' },
          discount_value: { type: 'number', description: 'Fixed Rp amount to discount. Use for fixed_amount or bundle with fixed discount.' },
          item_id: { type: 'string', description: 'Target item ID for single-item promos. DO NOT set for bundle promos.' },
          applies_to: { type: 'string', enum: ['item', 'cart'], description: 'Apply to specific item or entire cart. Use item for bundle.' },
          bogo_rules: {
            type: 'array',
            description: 'BOGO rules if promo_type is bogo',
            items: {
              type: 'object',
              properties: {
                buy_qty: { type: 'number' },
                get_qty: { type: 'number' }
              },
              required: ['buy_qty', 'get_qty']
            }
          },
          tiers: {
            type: 'array',
            description: 'Tiers if promo_type is tiered',
            items: {
              type: 'object',
              properties: {
                min_qty: { type: 'number' },
                discount_percent: { type: 'number' }
              },
              required: ['min_qty', 'discount_percent']
            }
          },
          bundle_items: {
            type: 'array',
            description: 'Required for bundle type. List of items in the bundle, each with item_id and qty.',
            items: {
              type: 'object',
              properties: {
                item_id: { type: 'string', description: 'The item ID to include in bundle' },
                qty: { type: 'number', description: 'Required quantity of this item in bundle' }
              },
              required: ['item_id', 'qty']
            }
          }
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
  },
  {
    type: 'function',
    function: {
      name: 'list_promos',
      description: 'List all promotions (promos). Use this to show active or all promos to the user.',
      parameters: {
        type: 'object',
        properties: {
          active_only: { type: 'boolean', description: 'If true, return only active promos. Default false = return all.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_promo',
      description: 'Delete a promotion.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Promo ID to delete' }
        },
        required: ['id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'toggle_promo_active',
      description: 'Activate or deactivate a promotion.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Promo ID to toggle' }
        },
        required: ['id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_item',
      description: 'Delete an item from inventory.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Item ID to delete' }
        },
        required: ['id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_customer',
      description: 'Delete or deactivate a customer.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Customer ID' }
        },
        required: ['id']
      }
    }
  }
];

export const TOOL_ROLE_REQUIREMENTS: Record<string, string[]> = {
  search_items: ['owner', 'admin', 'staff'],
  get_stock_overview: ['owner', 'admin', 'staff'],
  adjust_stock: ['owner', 'admin', 'staff'],
  bulk_stock_opname: ['owner', 'admin', 'staff'],
  update_item_retail_price: ['owner', 'admin', 'staff'],
  update_item_wholesale_price: ['owner', 'admin', 'staff'],
  get_sales_summary: ['owner', 'admin', 'staff'],
  create_promo: ['owner', 'admin', 'staff'],
  delete_promo: ['owner', 'admin'],
  toggle_promo_active: ['owner', 'admin'],
  delete_item: ['owner', 'admin'],
  add_customer: ['owner', 'admin', 'staff'],
  delete_customer: ['owner', 'admin'],
  list_promos: ['owner', 'admin', 'staff'],
};

export async function executeTool(name: string, args: any, context: { branchId: string; userId: string; role: string }) {
  // Enforce roles (User management tools, if added in the future, should be restricted. All other tools are allowed for all roles).
  const isUserManagement = name.includes('user') || name.includes('role') || name.includes('permission');
  if (isUserManagement && context.role !== 'owner' && context.role !== 'admin') {
    return { error: `Permission Denied. User role '${context.role}' is not allowed to use user management tool '${name}'.` };
  }

  try {
    switch (name) {
      case 'search_items':
        return await api.getItemsFiltered(args.search || '', '', '', false, 1, 20);
      case 'get_stock_overview':
        return await api.getStockOverview(context.branchId);
      case 'adjust_stock':
        return await api.adjustStock(args.item_id, args.unit_id, context.branchId, args.qty, args.direction, args.notes, context.userId);
      case 'bulk_stock_opname':
        if (!args.items || args.items.length === 0) return { error: 'No items provided' };
        // DO NOT COMMIT DIRECTLY. Return payload to trigger UI Preview.
        return { 
          requires_user_approval: true, 
          action: 'preview_bulk_opname', 
          items: args.items,
          message: "Preview generated. Waiting for user to review and approve."
        };
      case 'update_item_retail_price':
        return await api.setItemPrice(args.item_id, args.unit_id, args.customer_tier, args.price);
      case 'update_item_wholesale_price':
        return await api.updateItemWholesalePrice(args.item_id, args.price);
      case 'get_sales_summary':
        return await api.getSalesSummary(context.branchId, args.date_from, args.date_to);
      
      case 'create_promo': {
        if (!args.name) throw new Error('Nama promo wajib diisi.');
        if (!args.promo_type) throw new Error('Tipe promo wajib diisi.');

        // For bundle: validate bundle_items and discount
        if (args.promo_type === 'bundle') {
          if (!args.bundle_items || args.bundle_items.length === 0) {
            throw new Error('Untuk promo bundle, Anda harus menentukan daftar item (bundle_items).');
          }
          if ((!args.discount_percent || args.discount_percent === 0) && (!args.discount_value || args.discount_value === 0)) {
            throw new Error('Anda harus menentukan diskon (persentase atau nilai tetap) untuk bundle.');
          }
          // Bundle always applies_to='item', clear any single item_id
          args.applies_to = 'item';
          // For bundle, item_id should NOT be set (the items are in bundle_items)
          args.item_id = undefined;
        }

        // Default values
        if (!args.min_qty) args.min_qty = 1;
        if (!args.applies_to) args.applies_to = 'item';
        if (!args.stack_rule) args.stack_rule = 'best_only';
        if (!args.priority) args.priority = 0;
        if (!args.bogo_rules) args.bogo_rules = [];
        if (!args.tiers) args.tiers = [];
        if (!args.bundle_items) args.bundle_items = [];

        return await api.createPromo({
          name: args.name,
          promo_type: args.promo_type,
          min_qty: args.min_qty,
          discount_percent: args.discount_percent || 0,
          discount_value: args.discount_value || 0,
          applies_to: args.applies_to,
          item_id: args.item_id,
          member_only: 0,
          stack_rule: args.stack_rule,
          priority: args.priority,
          bogo_rules: args.bogo_rules,
          tiers: args.tiers,
          bundle_items: args.bundle_items
        });
      }

      case 'add_customer':
        return await api.addCustomer(args.name, args.phone, undefined, undefined, undefined, args.customer_tier);
      case 'list_promos':
        return await api.getPromos(args.active_only ?? false);
      case 'delete_promo':
        return await api.deletePromo(args.id);
      case 'toggle_promo_active':
        return await api.togglePromoActive(args.id);
      case 'delete_item':
        return await api.deleteItem(args.id);
      case 'delete_customer':
        return await api.toggleCustomerActive(args.id); // Typically soft-deleted
      default:
        return { error: `Tool ${name} not implemented.` };
    }
  } catch (err: any) {
    // Return a clean error message so AI can show it to user
    return { error: err.message || err.toString() };
  }
}