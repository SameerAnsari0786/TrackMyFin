import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button, Input } from '../components/ui/FormElements';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { apiService } from '../services/apiService';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  CreditCard,
  AlertCircle,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download
} from 'lucide-react';
import ExportModal from '../components/ui/ExportModal';

interface Transaction {
  id: number;
  amount: number;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  categoryId: number;
  categoryName?: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Category {
  id: number;
  name: string;
  type: 'INCOME' | 'EXPENSE';
}

interface TransactionFormData {
  amount: string;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  categoryId: string;
  date: string;
}

interface BalanceSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
}

const Transactions: React.FC = () => {
  useDocumentTitle('Transactions');
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { 
    transactions: dataTransactions, 
    categories: dataCategories, 
    salaries: dataSalaries,
    refreshTransactions, 
    refreshSalaries 
  } = useData();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0
  });
  
  const { success, error } = useToast();

  const [formData, setFormData] = useState<TransactionFormData>({
    amount: '',
    description: '',
    type: 'EXPENSE',
    categoryId: '',
    date: new Date().toISOString().split('T')[0], // Today's date
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Helper function to get category name by ID
  const getCategoryName = (categoryId: number): string => {
    if (!categories || !categoryId) return 'Unknown';
    
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown';
  };

  const calculateBalanceSummary = useCallback((transactionList: Transaction[]) => {
    const summary = transactionList.reduce(
      (acc, transaction) => {
        if (transaction.type === 'INCOME') {
          acc.totalIncome += transaction.amount;
        } else {
          acc.totalExpenses += transaction.amount;
        }
        return acc;
      },
      { totalIncome: 0, totalExpenses: 0, netBalance: 0 }
    );
    
    // Add salary amounts to total income
    if (dataSalaries) {
      dataSalaries.forEach(salary => {
        summary.totalIncome += salary.amount;
      });
    }
    
    summary.netBalance = summary.totalIncome - summary.totalExpenses;
    setBalanceSummary(summary);
  }, [dataSalaries]);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading transactions...');
      const data = await apiService.getTransactions();
      console.log('📋 Loaded transactions data:', data);
      console.log('🗓️ First transaction date check:', data[0]?.date, 'Type:', typeof data[0]?.date);
      setTransactions(data);
      calculateBalanceSummary(data);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
      let errorMessage = 'Cannot connect to server';
      let errorDetails = 'Please ensure the backend is running on http://localhost:8080';
      
      if (err.status === 401) {
        errorMessage = 'Authentication required';
        errorDetails = 'Please login to access transactions';
      }
      
      error(errorMessage, errorDetails);
    } finally {
      setLoading(false);
    }
  }, [calculateBalanceSummary, error]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await apiService.getCategories();
      setCategories(data);
    } catch (err: any) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadTransactions();
      loadCategories();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, loadTransactions, loadCategories]);

  // Update local state when DataContext data changes
  useEffect(() => {
    if (dataTransactions) {
      setTransactions(dataTransactions);
      calculateBalanceSummary(dataTransactions);
    }
  }, [dataTransactions, dataSalaries, calculateBalanceSummary]); // Recalculate when transactions or salaries change

  useEffect(() => {
    if (dataCategories) {
      setCategories(dataCategories);
    }
  }, [dataCategories]);

  const resetForm = () => {
    setFormData({
      amount: '',
      description: '',
      type: 'EXPENSE',
      categoryId: '',
      date: new Date().toISOString().split('T')[0],
    });
    setFormErrors({});
    setEditingTransaction(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    // Ensure date is in YYYY-MM-DD format for the date input
    // Handle cases where date might be undefined, null, or empty
    let dateForInput = '';
    if (transaction.date) {
      dateForInput = transaction.date.includes('T') 
        ? transaction.date.split('T')[0] 
        : transaction.date;
    } else {
      // Fallback to current date if transaction date is missing
      dateForInput = new Date().toISOString().split('T')[0];
    }
    
    setFormData({
      amount: transaction.amount?.toString() || '',
      description: transaction.description || '',
      type: transaction.type || 'EXPENSE',
      categoryId: transaction.categoryId?.toString() || '',
      date: dateForInput,
    });
    setEditingTransaction(transaction);
    setIsModalOpen(true);
    
    console.log('📝 Opening edit modal for transaction:', {
      transactionId: transaction.id,
      originalDate: transaction.date,
      formattedDate: dateForInput,
      fullTransaction: transaction,
      formData: {
        amount: transaction.amount?.toString() || '',
        description: transaction.description || '',
        type: transaction.type || 'EXPENSE',
        categoryId: transaction.categoryId?.toString() || '',
        date: dateForInput,
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const errors: Record<string, string> = {};
    if (!formData.amount.trim() || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      errors.amount = 'Valid amount is required';
    }
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }
    if (!formData.categoryId) {
      errors.categoryId = 'Category is required';
    }
    if (!formData.date) {
      errors.date = 'Date is required';
    }
    
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setFormLoading(true);
      const transactionData = {
        amount: Number(formData.amount),
        description: formData.description.trim(),
        type: formData.type,
        categoryId: Number(formData.categoryId),
        date: formData.date,
      };
      
      console.log('🔄 Submitting transaction data:', {
        transactionData,
        isEditing: !!editingTransaction,
        editingTransactionId: editingTransaction?.id
      });
      
      if (editingTransaction) {
        const result = await apiService.updateTransaction(editingTransaction.id, transactionData);
        console.log('✅ Update transaction result:', result);
        success('Transaction updated', 'Transaction updated successfully');
      } else {
        const result = await apiService.addTransaction(transactionData);
        console.log('✅ Add transaction result:', result);
        success('Transaction created', 'Transaction created successfully');
      }
      
      // Refresh both transactions and salaries from DataContext
      await refreshTransactions();
      await refreshSalaries(); // Refresh salaries in case this affects income calculations
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('❌ Failed to save transaction:', {
        error: err,
        message: err.message,
        stack: err.stack,
        response: err.response?.data
      });
      error('Failed to save transaction', err.message || 'Unknown error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      setDeletingId(id);
      await apiService.deleteTransaction(id);
      success('Transaction deleted', 'Transaction deleted successfully');
      // Refresh both transactions and salaries from DataContext
      await refreshTransactions();
      await refreshSalaries(); // Refresh salaries in case this affects income calculations
    } catch (err: any) {
      error('Failed to delete transaction', err.message || 'Unknown error');
    } finally {
      setDeletingId(null);
    }
  };
  const filteredTransactions = transactions
    .map(transaction => ({
      ...transaction,
      categoryName: transaction.categoryName || getCategoryName(transaction.categoryId)
    }))
    .filter(transaction => {
      const searchLower = searchTerm.toLowerCase();
      return (
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.categoryName?.toLowerCase().includes(searchLower)
      );
    });

  const getFilteredCategories = () => {
    return categories.filter(category => category.type === formData.type);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    console.log('🗓️ Attempting to format date:', { dateString, type: typeof dateString });
    
    if (!dateString) {
      console.log('❌ No date string provided');
      return 'No Date';
    }
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('❌ Invalid date string:', dateString);
        return 'Invalid Date';
      }
      
      const formatted = date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      console.log('✅ Successfully formatted date:', { input: dateString, output: formatted });
      return formatted;
    } catch (error) {
      console.error('❌ Date parsing error:', error, 'for date:', dateString);
      return 'Invalid Date';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <div className="text-center p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Loading...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Checking authentication status
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <div className="text-center p-6">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please login to access transactions.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your income and expense transactions
          </p>
        </div>

        {/* Balance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Income</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(balanceSummary.totalIncome)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Expenses</h3>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(balanceSummary.totalExpenses)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className={`h-8 w-8 ${balanceSummary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Balance</h3>
                  <p className={`text-2xl font-bold ${balanceSummary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(balanceSummary.netBalance)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setIsExportModalOpen(true)}
              disabled={transactions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={openAddModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* Transactions Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No transactions found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {searchTerm ? 'No transactions match your search' : 'Create your first transaction to get started'}
              </p>
              <Button onClick={openAddModal}>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${
                          transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {transaction.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.type === 'INCOME' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {transaction.categoryName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(transaction)}
                            disabled={deletingId === transaction.id}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(transaction.id)}
                            loading={deletingId === transaction.id}
                            disabled={deletingId === transaction.id}
                            className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Transaction Form Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingTransaction ? "Edit Transaction" : "Add Transaction"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                placeholder="Enter amount"
                required
                error={formErrors.amount}
              />
            </div>
            
            <div>
              <Input
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Enter description"
                required
                error={formErrors.description}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                value={formData.type}
                onChange={(e) => {
                  setFormData({
                    ...formData, 
                    type: e.target.value as 'INCOME' | 'EXPENSE',
                    categoryId: '' // Reset category when type changes
                  });
                }}
                required
              >
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                value={formData.categoryId}
                onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                required
              >
                <option value="">Select a category</option>
                {getFilteredCategories().map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {formErrors.categoryId && (
                <p className="mt-1 text-sm text-red-600">{formErrors.categoryId}</p>
              )}
            </div>
            
            <div>
              <Input
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
                error={formErrors.date}
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsModalOpen(false)} 
                type="button"
                disabled={formLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                loading={formLoading}
                disabled={formLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                {editingTransaction ? 'Update' : 'Create'} Transaction
              </Button>
            </div>
          </form>
        </Modal>

        {/* Export Modal */}
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          transactions={[
            ...transactions,
            // Add salaries as income transactions for export
            ...(dataSalaries?.map((salary, index) => ({
              id: -1000 - index, // Use negative IDs for salaries to avoid conflicts
              amount: salary.amount,
              description: `${salary.description} (Salary)`,
              type: 'INCOME' as const,
              categoryId: 1, // Use a valid category ID
              categoryName: 'Salary',
              date: salary.date,
              createdAt: salary.date,
              updatedAt: salary.date
            })) || [])
          ]}
          categories={categories}
        />
      </div>
    </div>
  );
};

export default Transactions;