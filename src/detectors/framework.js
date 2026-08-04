/**
 * Détecteur Framework - Identifie le framework du projet
 */

const path = require('path');
const fs = require('fs');

class FrameworkDetector {
  constructor() {
    this.root = process.cwd();
  }

  async detect() {
    const result = {
      framework: null,
      version: null,
      language: null,
      detectedBy: null
    };

    // Laravel (PHP)
    if (fs.existsSync(path.join(this.root, 'artisan'))) {
      result.framework = 'laravel';
      result.language = 'php';
      result.detectedBy = 'artisan';
      try {
        const composerJson = JSON.parse(fs.readFileSync(path.join(this.root, 'composer.json'), 'utf8'));
        result.version = composerJson.require?.['laravel/framework'];
      } catch (error) {}
    }
    // Next.js (Node)
    else if (fs.existsSync(path.join(this.root, 'next.config.js')) || 
             fs.existsSync(path.join(this.root, 'next.config.mjs'))) {
      result.framework = 'nextjs';
      result.language = 'javascript';
      result.detectedBy = 'next.config';
      try {
        const packageJson = JSON.parse(fs.readFileSync(path.join(this.root, 'package.json'), 'utf8'));
        result.version = packageJson.dependencies?.next;
      } catch (error) {}
    }
    // React (Node)
    else if (fs.existsSync(path.join(this.root, 'package.json'))) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(path.join(this.root, 'package.json'), 'utf8'));
        if (packageJson.dependencies?.react) {
          result.framework = 'react';
          result.language = 'javascript';
          result.detectedBy = 'package.json';
          result.version = packageJson.dependencies.react;
        }
        // Vue.js
        else if (packageJson.dependencies?.vue) {
          result.framework = 'vue';
          result.language = 'javascript';
          result.detectedBy = 'package.json';
          result.version = packageJson.dependencies.vue;
        }
        // Nuxt
        else if (packageJson.dependencies?.nuxt) {
          result.framework = 'nuxt';
          result.language = 'javascript';
          result.detectedBy = 'package.json';
          result.version = packageJson.dependencies.nuxt;
        }
        // NestJS
        else if (packageJson.dependencies?.['@nestjs/core']) {
          result.framework = 'nestjs';
          result.language = 'typescript';
          result.detectedBy = 'package.json';
          result.version = packageJson.dependencies['@nestjs/core'];
        }
        // Express
        else if (packageJson.dependencies?.express) {
          result.framework = 'express';
          result.language = 'javascript';
          result.detectedBy = 'package.json';
          result.version = packageJson.dependencies.express;
        }
        // Fastify
        else if (packageJson.dependencies?.fastify) {
          result.framework = 'fastify';
          result.language = 'javascript';
          result.detectedBy = 'package.json';
          result.version = packageJson.dependencies.fastify;
        }
      } catch (error) {}
    }
    // Angular (Node)
    else if (fs.existsSync(path.join(this.root, 'angular.json'))) {
      result.framework = 'angular';
      result.language = 'typescript';
      result.detectedBy = 'angular.json';
      try {
        const packageJson = JSON.parse(fs.readFileSync(path.join(this.root, 'package.json'), 'utf8'));
        result.version = packageJson.dependencies?.['@angular/core'];
      } catch (error) {}
    }
    // Flutter (Dart)
    else if (fs.existsSync(path.join(this.root, 'pubspec.yaml'))) {
      result.framework = 'flutter';
      result.language = 'dart';
      result.detectedBy = 'pubspec.yaml';
    }
    // Symfony (PHP)
    else if (fs.existsSync(path.join(this.root, 'symfony.lock'))) {
      result.framework = 'symfony';
      result.language = 'php';
      result.detectedBy = 'symfony.lock';
    }
    // Go
    else if (fs.existsSync(path.join(this.root, 'go.mod'))) {
      result.framework = 'go';
      result.language = 'go';
      result.detectedBy = 'go.mod';
    }
    // Python (Django/Flask)
    else if (fs.existsSync(path.join(this.root, 'requirements.txt')) ||
             fs.existsSync(path.join(this.root, 'pyproject.toml'))) {
      result.framework = 'python';
      result.language = 'python';
      result.detectedBy = 'requirements.txt';
    }

    return result;
  }
}

module.exports = FrameworkDetector;
