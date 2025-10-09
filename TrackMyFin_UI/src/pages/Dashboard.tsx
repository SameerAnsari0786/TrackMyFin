import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { StatCard } from '../components/ui/Card';
import { ConnectionStatus } from '../components/ui/ConnectionStatus';
import { AddSalaryForm, SalaryList, Salary } from '../components/dashboard/SalarySection';
import { ExpenseChart, ExpenseData, CategoryExpense } from '../components/dashboard/ExpenseChart';
import { CategoriesList, Category as DashboardCategory, CategoryFormData } from '../components/dashboard/CategoriesSection';
import ExportModal from '../components/ui/ExportModal';
import QuickExportButton from '../components/ui/QuickExportButton';
import { apiService } from '../services/apiService';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  AlertCircle
} from 'lucide-react';

const Dashboard: React.FC = () => {
  useDocumentTitle('Dashboard');
  const { user, logout } = useAuth();
  const { 
    dashboardStats, 
    categories, 
    salaries, 
    transactions,
    isLoading, 
    refreshDashboard,
    refreshCategories,
    refreshSalaries 
  } = useData();
  
  // Local state for additional dashboard data
  const [localSalaries, setLocalSalaries] = useState<Salary[]>([]);
  const [localCategories, setLocalCategories] = useState<DashboardCategory[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [categoryExpenseData, setCategoryExpenseData] = useState<CategoryExpense[]>([]);
  
  // Loading states for additional data
  const [loading, setLoading] = useState({
    expenses: true,
  });
  
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Update local states when data changes
  useEffect(() => {
    if (salaries) {
      setLocalSalaries(salaries);
    }
  }, [salaries]);

  useEffect(() => {
    if (categories) {
      // Convert DataContext categories to Dashboard categories by adding color
      const categoriesWithColor = categories.map((cat, index) => ({
        ...cat,
        color: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][index % 6]
      }));
      setLocalCategories(categoriesWithColor);
    }
  }, [categories]);

  // Process expense data from transactions instead of separate API call
  const processExpenseData = useCallback((transactionData: any[], categoryData: any[]) => {
    try {
      setLoading(prev => ({ ...prev, expenses: true }));
      console.log('🔄 Processing expense data from transactions...');
      console.log('📊 Transaction data:', transactionData);
      console.log('🏷️ Category data:', categoryData);
      
      // Filter expense transactions - handle both uppercase and lowercase
      const expenseTransactions = transactionData.filter(t => {
        const typeMatch = t.type && t.type.toString().toUpperCase() === 'EXPENSE';
        console.log(`🔍 Transaction: ${t.description}, Type: "${t.type}", Matches EXPENSE: ${typeMatch}`);
        return typeMatch;
      });
      console.log('💰 Expense transactions found:', expenseTransactions.length);
      console.log('💰 Expense transactions details:', expenseTransactions);
      
      // Generate monthly data for last 6 months
      const monthlyData = generateMonthlyExpenseData(expenseTransactions);
      console.log('📈 Generated monthly data:', monthlyData);
      
      // Generate category data
      const categoryExpenseData = generateCategoryExpenseData(expenseTransactions, categoryData);
      console.log('🏷️ Generated category data:', categoryExpenseData);
      
      setExpenseData(monthlyData);
      setCategoryExpenseData(categoryExpenseData);
    } catch (error) {
      console.error('❌ Failed to process expense data:', error);
      setError('Failed to process expense data');
    } finally {
      setLoading(prev => ({ ...prev, expenses: false }));
    }
  }, []);

  useEffect(() => {
    if (transactions && categories) {
      processExpenseData(transactions, categories);
    }
  }, [transactions, categories, processExpenseData]);

  const generateMonthlyExpenseData = (expenseTransactions: any[]) => {
    const monthlyMap = new Map();
    const now = new Date();
    
    // Initialize last 6 months with zero values
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyMap.set(monthKey, { month: monthKey, amount: 0 });
    }
    
    console.log('📅 Generated month keys:', Array.from(monthlyMap.keys()));
    
    // Populate with actual expense data
    expenseTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      console.log(`💰 Processing transaction: ${transaction.description}, Date: ${transaction.date}, Month: ${monthKey}, Amount: ${transaction.amount}`);
      
      if (monthlyMap.has(monthKey)) {
        const existing = monthlyMap.get(monthKey);
        existing.amount += Number(transaction.amount) || 0;
        console.log(`✅ Added ₹${transaction.amount} to ${monthKey}, new total: ₹${existing.amount}`);
      } else {
        console.log(`⚠️ Month ${monthKey} not in range, skipping`);
      }
    });
    
    const result = Array.from(monthlyMap.values());
    console.log('📊 Final monthly expense data:', result);
    return result;
  };

  const generateCategoryExpenseData = (expenseTransactions: any[], categoryData: any[]) => {
    const categoryMap = new Map();
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
    
    expenseTransactions.forEach(transaction => {
      const category = categoryData.find(c => c.id === transaction.categoryId);
      const categoryName = category?.name || transaction.categoryName || 'Uncategorized';
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, 0);
      }
      categoryMap.set(categoryName, categoryMap.get(categoryName) + (Number(transaction.amount) || 0));
    });
    
    let colorIndex = 0;
    return Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
      color: colors[colorIndex++ % colors.length]
    }));
  };

  // Optimistic update handlers
  const handleAddSalary = async (salaryData: Omit<Salary, 'id'>) => {
    try {
      const newSalary = await apiService.addSalary(salaryData);
      setLocalSalaries(prev => [newSalary, ...prev]);
      await refreshDashboard(); // Refresh stats
      await refreshSalaries(); // Refresh global salaries
    } catch (error) {
      console.error('Failed to add salary:', error);
    }
  };

  const handleDeleteSalary = async (id: string) => {
    try {
      setLocalSalaries(prev => prev.filter(s => s.id !== id));
      await apiService.deleteSalary(id);
      await refreshDashboard(); // Refresh stats
      await refreshSalaries(); // Refresh global salaries
    } catch (error) {
      console.error('Failed to delete salary:', error);
      // Revert optimistic update on error
      if (salaries) {
        setLocalSalaries(salaries);
      }
    }
  };

  const handleAddCategory = async (categoryData: CategoryFormData) => {
    try {
      const newCategory = await apiService.addCategory(categoryData);
      setLocalCategories(prev => [newCategory, ...prev]);
      await refreshCategories(); // Refresh global categories
    } catch (error) {
      console.error('Failed to add category:', error);
    }
  };

  const handleEditCategory = async (id: number, categoryData: CategoryFormData) => {
    try {
      const updatedCategory = await apiService.updateCategory(id, categoryData);
      setLocalCategories(prev => 
        prev.map(c => c.id === id ? updatedCategory : c)
      );
      await refreshCategories(); // Refresh global categories
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      setLocalCategories(prev => prev.filter(c => c.id !== id));
      await apiService.deleteCategory(id);
      await refreshCategories(); // Refresh global categories
    } catch (error) {
      console.error('Failed to delete category:', error);
      // Revert optimistic update on error
      if (categories) {
        const categoriesWithColor = categories.map((cat, index) => ({
          ...cat,
          color: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][index % 6]
        }));
        setLocalCategories(categoriesWithColor);
      }
    }
  };

  // Calculate derived stats
  const getFormattedStats = () => {
    if (!dashboardStats) return null;

    return {
      totalBalance: `₹${dashboardStats.totalBalance.toLocaleString('en-IN')}`,
      monthlyIncome: `₹${dashboardStats.monthlyIncome.toLocaleString('en-IN')}`,
      monthlyExpenses: `₹${dashboardStats.monthlyExpenses.toLocaleString('en-IN')}`,
      savingsRate: `${dashboardStats.savingsRate.toFixed(1)}%`
    };
  };

  const stats = getFormattedStats();

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user.firstName}!
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Here's your financial overview
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-4">
            <QuickExportButton
              transactions={transactions || []}
              categories={localCategories}
              onExport={() => setIsExportModalOpen(true)}
              variant="secondary"
            />
            <ConnectionStatus />
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <span className="text-red-700 dark:text-red-300">Error Loading Dashboard</span>
            </div>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Balance"
              value={stats.totalBalance}
              icon={<DollarSign className="h-6 w-6" />}
              iconColor="green"
            />
            <StatCard
              title="Monthly Income"
              value={stats.monthlyIncome}
              icon={<TrendingUp className="h-6 w-6" />}
              iconColor="blue"
            />
            <StatCard
              title="Monthly Expenses"
              value={stats.monthlyExpenses}
              icon={<TrendingDown className="h-6 w-6" />}
              iconColor="red"
            />
            <StatCard
              title="Savings Rate"
              value={stats.savingsRate}
              icon={<BarChart3 className="h-6 w-6" />}
              iconColor="purple"
            />
          </div>
        )}

        {/* Salary and Expense Chart Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <AddSalaryForm 
              onSubmit={handleAddSalary}
              loading={isLoading}
            />
            <SalaryList 
              salaries={localSalaries}
              loading={isLoading}
              onDelete={handleDeleteSalary}
            />
          </div>
          
          <ExpenseChart
            monthlyData={expenseData}
            categoryData={categoryExpenseData}
            loading={loading.expenses}
          />
        </div>

        {/* Categories Section */}
        <div className="grid grid-cols-1 gap-8">
          <CategoriesList
            categories={localCategories}
            loading={isLoading}
            onAdd={handleAddCategory}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
          />
        </div>

        {/* Export Modal */}
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          transactions={transactions || []}
          categories={localCategories}
          salaries={salaries || []}
        />
      </div>
    </div>
  );
};

export default Dashboard;