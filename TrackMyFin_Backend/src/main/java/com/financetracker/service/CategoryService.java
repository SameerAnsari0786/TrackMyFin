package com.financetracker.service;

import com.financetracker.entity.Category;
import com.financetracker.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public Category createCategory(Category category) {
        if (categoryRepository.existsByNameAndType(category.getName(), category.getType())) {
            throw new RuntimeException("Category with this name and type already exists");
        }
        return categoryRepository.save(category);
    }

    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    public List<Category> getCategoriesByType(Category.CategoryType type) {
        return categoryRepository.findByTypeOrderByName(type);
    }

    public List<Category> getDefaultCategories() {
        return categoryRepository.findByIsDefaultTrueOrderByName();
    }

    public Optional<Category> getCategoryById(Long id) {
        return categoryRepository.findById(id);
    }

    public Category updateCategory(Category category) {
        return categoryRepository.save(category);
    }

    public void deleteCategory(Long id) {
        categoryRepository.deleteById(id);
    }

    public void initializeDefaultCategories() {
        if (categoryRepository.count() == 0) {
            createDefaultIncomeCategories();
            createDefaultExpenseCategories();
        }
    }

    private void createDefaultIncomeCategories() {
        Category[] incomeCategories = {
            new Category(null, "Salary", "Monthly salary", "#4CAF50", "💼", Category.CategoryType.INCOME, true, null, null, null),
            new Category(null, "Freelance", "Freelance work", "#8BC34A", "💻", Category.CategoryType.INCOME, true, null, null, null),
            new Category(null, "Investment", "Investment returns", "#009688", "📈", Category.CategoryType.INCOME, true, null, null, null),
            new Category(null, "Business", "Business income", "#FF9800", "🏢", Category.CategoryType.INCOME, true, null, null, null)
        };

        for (Category category : incomeCategories) {
            categoryRepository.save(category);
        }
    }

    private void createDefaultExpenseCategories() {
        Category[] expenseCategories = {
            new Category(null, "Food", "Food and dining", "#FF5722", "🍽️", Category.CategoryType.EXPENSE, true, null, null, null),
            new Category(null, "Transportation", "Transport costs", "#2196F3", "🚗", Category.CategoryType.EXPENSE, true, null, null, null),
            new Category(null, "Shopping", "Shopping expenses", "#E91E63", "🛍️", Category.CategoryType.EXPENSE, true, null, null, null),
            new Category(null, "Entertainment", "Entertainment costs", "#9C27B0", "🎬", Category.CategoryType.EXPENSE, true, null, null, null),
            new Category(null, "Bills", "Utility bills", "#607D8B", "📄", Category.CategoryType.EXPENSE, true, null, null, null),
            new Category(null, "Healthcare", "Medical expenses", "#F44336", "⚕️", Category.CategoryType.EXPENSE, true, null, null, null)
        };

        for (Category category : expenseCategories) {
            categoryRepository.save(category);
        }
    }
}
