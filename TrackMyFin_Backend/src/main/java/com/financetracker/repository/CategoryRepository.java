package com.financetracker.repository;

import com.financetracker.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByTypeOrderByName(Category.CategoryType type);

    List<Category> findByIsDefaultTrueOrderByName();

    boolean existsByNameAndType(String name, Category.CategoryType type);
}
