package com.streamflix.video.application.service;

import com.streamflix.video.application.port.CategoryService;
import com.streamflix.video.domain.Category;
import com.streamflix.video.domain.CategoryRepository;
import com.streamflix.video.domain.exception.CategoryNotFoundException;
import com.streamflix.video.domain.exception.ValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of the CategoryService interface.
 * This is part of the application layer and orchestrates domain operations.
 */
@Service
public class CategoryServiceImpl implements CategoryService {

    private static final Logger logger = LoggerFactory.getLogger(CategoryServiceImpl.class);

    private final CategoryRepository categoryRepository;

    public CategoryServiceImpl(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Override
    @Transactional
    public Category createCategory(String name, String description) {
        logger.info("Creating new category with name: {}", name);
        
        // Validate input
        if (!StringUtils.hasText(name)) {
            throw new ValidationException("Category name cannot be empty");
        }
        
        Category category = new Category(name, description);
        return categoryRepository.save(category);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Category> getCategory(UUID id) {
        logger.info("Retrieving category by id: {}", id);
        return categoryRepository.findById(id);
    }

    @Override
    @Transactional
    public Optional<Category> updateCategory(UUID id, String name, String description) {
        logger.info("Updating category with id: {}", id);
        
        Category category = categoryRepository.findById(id)
            .orElseThrow(() -> new CategoryNotFoundException(id));
        
        if (name != null) {
            if (!StringUtils.hasText(name)) {
                throw new ValidationException("Category name cannot be empty");
            }
            category.setName(name);
        }
        
        if (description != null) {
            category.setDescription(description);
        }
        
        return Optional.of(categoryRepository.save(category));
    }

    @Override
    @Transactional
    public boolean deleteCategory(UUID id) {
        logger.info("Deleting category with id: {}", id);
        
        if (!categoryRepository.existsById(id)) {
            return false;
        }
        
        categoryRepository.deleteById(id);
        return true;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Category> listAllCategories() {
        logger.info("Listing all categories");
        return categoryRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Category> listCategories(int page, int size) {
        logger.info("Listing categories with pagination, page: {}, size: {}", page, size);
        return categoryRepository.findAll(page, size);
    }
}