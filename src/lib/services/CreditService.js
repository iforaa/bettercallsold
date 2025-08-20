import { query, getClient } from "$lib/database.js";
import { DEFAULT_TENANT_ID } from "$lib/constants.js";

/**
 * CreditService - Core business logic for account credits system
 * 
 * Handles all credit balance management, transaction recording, and validation.
 * Ensures accurate financial tracking and multi-tenant isolation.
 */
export class CreditService {
  
  /**
   * Get user's current credit balance and statistics
   */
  static async getUserBalance(userId) {
    try {
      const result = await query(`
        SELECT balance, total_earned, total_spent, created_at, updated_at
        FROM user_credit_balances
        WHERE tenant_id = $1 AND user_id = $2
      `, [DEFAULT_TENANT_ID, userId]);

      if (result.rows.length === 0) {
        // Create initial balance record if doesn't exist
        await this.createUserBalanceRecord(userId);
        return {
          balance: 0.00,
          total_earned: 0.00,
          total_spent: 0.00,
          created_at: new Date(),
          updated_at: new Date()
        };
      }

      return {
        balance: parseFloat(result.rows[0].balance),
        total_earned: parseFloat(result.rows[0].total_earned),
        total_spent: parseFloat(result.rows[0].total_spent),
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at
      };
    } catch (error) {
      console.error('Error getting user balance:', error);
      throw new Error('Failed to fetch user credit balance');
    }
  }

  /**
   * Assign credits to a user (admin action)
   */
  static async assignCredits(userId, amount, description, adminUserId, expiresAt = null) {
    if (amount <= 0) {
      throw new Error('Credit amount must be positive');
    }

    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Get current balance
      const currentBalance = await this.getUserBalance(userId);
      const newBalance = currentBalance.balance + amount;
      const newTotalEarned = currentBalance.total_earned + amount;

      // Update balance record
      await client.query(`
        INSERT INTO user_credit_balances (tenant_id, user_id, balance, total_earned, total_spent, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (tenant_id, user_id)
        DO UPDATE SET 
          balance = $3,
          total_earned = $4,
          updated_at = NOW()
      `, [DEFAULT_TENANT_ID, userId, newBalance, newTotalEarned, currentBalance.total_spent]);

      // Create transaction record
      const transactionResult = await client.query(`
        INSERT INTO credit_transactions (
          tenant_id, user_id, transaction_type, amount, balance_after,
          description, reference_type, admin_user_id, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, created_at
      `, [
        DEFAULT_TENANT_ID, userId, 'admin_grant', amount, newBalance,
        description, 'admin_action', adminUserId, expiresAt
      ]);

      await client.query('COMMIT');

      console.log(`✅ Credits assigned: $${amount} to user ${userId} by admin ${adminUserId}`);
      
      return {
        success: true,
        transaction_id: transactionResult.rows[0].id,
        new_balance: newBalance,
        amount_assigned: amount,
        created_at: transactionResult.rows[0].created_at
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error assigning credits:', error);
      throw new Error('Failed to assign credits: ' + error.message);
    } finally {
      client.release();
    }
  }

  /**
   * Deduct credits from user (during checkout)
   */
  static async deductCredits(userId, amount, description, referenceType = 'order', referenceId = null) {
    if (amount <= 0) {
      throw new Error('Deduction amount must be positive');
    }

    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Get current balance and validate sufficient funds
      const currentBalance = await this.getUserBalance(userId);
      
      if (currentBalance.balance < amount) {
        throw new Error(`Insufficient credits. Available: $${currentBalance.balance}, Required: $${amount}`);
      }

      const newBalance = currentBalance.balance - amount;
      const newTotalSpent = currentBalance.total_spent + amount;

      // Update balance record
      await client.query(`
        UPDATE user_credit_balances
        SET balance = $3, total_spent = $4, updated_at = NOW()
        WHERE tenant_id = $1 AND user_id = $2
      `, [DEFAULT_TENANT_ID, userId, newBalance, newTotalSpent]);

      // Create transaction record (negative amount for deduction)
      const transactionResult = await client.query(`
        INSERT INTO credit_transactions (
          tenant_id, user_id, transaction_type, amount, balance_after,
          description, reference_type, reference_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, created_at
      `, [
        DEFAULT_TENANT_ID, userId, 'order_deduction', -amount, newBalance,
        description, referenceType, referenceId
      ]);

      await client.query('COMMIT');

      console.log(`✅ Credits deducted: $${amount} from user ${userId} for ${referenceType}:${referenceId}`);
      
      return {
        success: true,
        transaction_id: transactionResult.rows[0].id,
        new_balance: newBalance,
        amount_deducted: amount,
        created_at: transactionResult.rows[0].created_at
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deducting credits:', error);
      throw error; // Re-throw to preserve error message for validation
    } finally {
      client.release();
    }
  }

  /**
   * Get all credit transactions across all users (admin overview)
   */
  static async getAllTransactions(limit = 50, offset = 0) {
    try {
      const result = await query(`
        SELECT 
          ct.*,
          u.name as customer_name,
          u.email as customer_email,
          CASE 
            WHEN ct.admin_user_id IS NOT NULL THEN admin_u.name
            ELSE 'System'
          END as admin_name
        FROM credit_transactions ct
        LEFT JOIN users u ON ct.user_id = u.id
        LEFT JOIN users admin_u ON ct.admin_user_id = admin_u.id
        WHERE ct.tenant_id = $1
        ORDER BY ct.created_at DESC
        LIMIT $2 OFFSET $3
      `, [DEFAULT_TENANT_ID, limit, offset]);

      return result.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        customer_name: row.customer_name,
        customer_email: row.customer_email,
        transaction_type: row.transaction_type,
        amount: parseFloat(row.amount),
        balance_after: parseFloat(row.balance_after),
        description: row.description,
        reference_type: row.reference_type,
        reference_id: row.reference_id,
        admin_name: row.admin_name,
        expires_at: row.expires_at,
        created_at: row.created_at,
        metadata: row.metadata
      }));
    } catch (error) {
      console.error('Error getting all transactions:', error);
      throw new Error('Failed to fetch all transactions');
    }
  }

  /**
   * Get user's credit transaction history
   */
  static async getTransactionHistory(userId, limit = 50, offset = 0) {
    try {
      const result = await query(`
        SELECT 
          ct.*,
          CASE 
            WHEN ct.admin_user_id IS NOT NULL THEN u.name
            ELSE 'System'
          END as admin_name
        FROM credit_transactions ct
        LEFT JOIN users u ON ct.admin_user_id = u.id
        WHERE ct.tenant_id = $1 AND ct.user_id = $2
        ORDER BY ct.created_at DESC
        LIMIT $3 OFFSET $4
      `, [DEFAULT_TENANT_ID, userId, limit, offset]);

      return result.rows.map(row => ({
        id: row.id,
        transaction_type: row.transaction_type,
        amount: parseFloat(row.amount),
        balance_after: parseFloat(row.balance_after),
        description: row.description,
        reference_type: row.reference_type,
        reference_id: row.reference_id,
        admin_name: row.admin_name,
        expires_at: row.expires_at,
        created_at: row.created_at,
        metadata: row.metadata
      }));
    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw new Error('Failed to fetch transaction history');
    }
  }

  /**
   * Manual balance adjustment (admin action for corrections/refunds)
   */
  static async adjustBalance(userId, amount, reason, adminUserId) {
    if (amount === 0) {
      throw new Error('Adjustment amount cannot be zero');
    }

    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      const currentBalance = await this.getUserBalance(userId);
      const newBalance = currentBalance.balance + amount;

      if (newBalance < 0) {
        throw new Error('Balance adjustment would result in negative balance');
      }

      // Update totals based on adjustment direction
      const newTotalEarned = amount > 0 ? 
        currentBalance.total_earned + amount : currentBalance.total_earned;
      const newTotalSpent = amount < 0 ? 
        currentBalance.total_spent + Math.abs(amount) : currentBalance.total_spent;

      // Update balance record
      await client.query(`
        UPDATE user_credit_balances
        SET balance = $3, total_earned = $4, total_spent = $5, updated_at = NOW()
        WHERE tenant_id = $1 AND user_id = $2
      `, [DEFAULT_TENANT_ID, userId, newBalance, newTotalEarned, newTotalSpent]);

      // Create transaction record
      const transactionResult = await client.query(`
        INSERT INTO credit_transactions (
          tenant_id, user_id, transaction_type, amount, balance_after,
          description, reference_type, admin_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, created_at
      `, [
        DEFAULT_TENANT_ID, userId, 'adjustment', amount, newBalance,
        reason, 'admin_adjustment', adminUserId
      ]);

      await client.query('COMMIT');

      console.log(`✅ Balance adjusted: $${amount} for user ${userId} by admin ${adminUserId}`);
      
      return {
        success: true,
        transaction_id: transactionResult.rows[0].id,
        new_balance: newBalance,
        adjustment_amount: amount,
        created_at: transactionResult.rows[0].created_at
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adjusting balance:', error);
      throw new Error('Failed to adjust balance: ' + error.message);
    } finally {
      client.release();
    }
  }

  /**
   * Get all customers with their credit balances (admin view)
   */
  static async getAllCustomerBalances(limit = 100, offset = 0) {
    try {
      const result = await query(`
        SELECT 
          u.id as user_id,
          u.name,
          u.email,
          u.phone,
          u.created_at as customer_since,
          COALESCE(ucb.balance, 0) as balance,
          COALESCE(ucb.total_earned, 0) as total_earned,
          COALESCE(ucb.total_spent, 0) as total_spent,
          ucb.updated_at as last_credit_activity,
          (
            SELECT ct.created_at
            FROM credit_transactions ct
            WHERE ct.user_id = u.id AND ct.tenant_id = $1
            ORDER BY ct.created_at DESC
            LIMIT 1
          ) as last_transaction_date
        FROM users u
        LEFT JOIN user_credit_balances ucb ON u.id = ucb.user_id AND ucb.tenant_id = $1
        WHERE u.tenant_id = $1 AND u.role = 'customer'
        ORDER BY ucb.balance DESC NULLS LAST, u.created_at DESC
        LIMIT $2 OFFSET $3
      `, [DEFAULT_TENANT_ID, limit, offset]);

      return result.rows.map(row => ({
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        customer_since: row.customer_since,
        balance: parseFloat(row.balance || 0),
        total_earned: parseFloat(row.total_earned || 0),
        total_spent: parseFloat(row.total_spent || 0),
        last_credit_activity: row.last_credit_activity,
        last_transaction_date: row.last_transaction_date
      }));
    } catch (error) {
      console.error('Error getting customer balances:', error);
      throw new Error('Failed to fetch customer credit balances');
    }
  }

  /**
   * Get credit system statistics (admin dashboard)
   */
  static async getCreditStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_customers_with_credits,
          COALESCE(SUM(balance), 0) as total_outstanding_balance,
          COALESCE(SUM(total_earned), 0) as total_credits_issued,
          COALESCE(SUM(total_spent), 0) as total_credits_used,
          COALESCE(AVG(balance), 0) as average_balance
        FROM user_credit_balances
        WHERE tenant_id = $1
      `, [DEFAULT_TENANT_ID]);

      const transactionResult = await query(`
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN transaction_type = 'admin_grant' THEN 1 END) as admin_grants,
          COUNT(CASE WHEN transaction_type = 'order_deduction' THEN 1 END) as order_deductions,
          COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at > NOW() THEN 1 END) as expiring_credits
        FROM credit_transactions
        WHERE tenant_id = $1
      `, [DEFAULT_TENANT_ID]);

      const stats = result.rows[0];
      const transactionStats = transactionResult.rows[0];

      return {
        total_customers_with_credits: parseInt(stats.total_customers_with_credits),
        total_outstanding_balance: parseFloat(stats.total_outstanding_balance),
        total_credits_issued: parseFloat(stats.total_credits_issued),
        total_credits_used: parseFloat(stats.total_credits_used),
        average_balance: parseFloat(stats.average_balance),
        total_transactions: parseInt(transactionStats.total_transactions),
        admin_grants: parseInt(transactionStats.admin_grants),
        order_deductions: parseInt(transactionStats.order_deductions),
        expiring_credits: parseInt(transactionStats.expiring_credits)
      };
    } catch (error) {
      console.error('Error getting credit stats:', error);
      throw new Error('Failed to fetch credit statistics');
    }
  }

  /**
   * Create initial balance record for new user
   */
  static async createUserBalanceRecord(userId) {
    try {
      await query(`
        INSERT INTO user_credit_balances (tenant_id, user_id, balance, total_earned, total_spent)
        VALUES ($1, $2, 0.00, 0.00, 0.00)
        ON CONFLICT (tenant_id, user_id) DO NOTHING
      `, [DEFAULT_TENANT_ID, userId]);
    } catch (error) {
      console.error('Error creating user balance record:', error);
      throw new Error('Failed to create user balance record');
    }
  }

  /**
   * Validate credit amount can be applied to current cart total
   */
  static async validateCreditApplication(userId, requestedAmount, cartTotal) {
    try {
      const balance = await this.getUserBalance(userId);
      
      if (balance.balance < requestedAmount) {
        return {
          valid: false,
          error: 'Insufficient credit balance',
          available_balance: balance.balance,
          requested_amount: requestedAmount
        };
      }

      if (requestedAmount > cartTotal) {
        return {
          valid: false,
          error: 'Credit amount exceeds cart total',
          max_applicable: cartTotal,
          requested_amount: requestedAmount
        };
      }

      return {
        valid: true,
        applicable_amount: requestedAmount,
        remaining_balance: balance.balance - requestedAmount
      };
    } catch (error) {
      console.error('Error validating credit application:', error);
      throw new Error('Failed to validate credit application');
    }
  }
}