'use strict';

    module.exports = function (grunt) {

    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        concat: {
            js: {
                options: {
                    banner:
                        'angular.module(\'datetime.bootstrap\', [\'datetime.bootstrap.directives\',' +
                                                                  '\'datetime.bootstrap.services\',' +
                                                                  '\'datetime.bootstrap.templates\']);\n\n'
                },
                src: ['./src/scripts/*.js'],
                dest: './dist/datetime-bootstrap.js'
            },
            css: {
                src: ['./src/styles/*.css'],
                dest: './dist/datetime-bootstrap.css'
            }
        },
        htmlangular: {
            options: {
                customtags: [
                    'date-input',
                    'time-input',
                    'numeric-dropdown'
                ],
                customattrs: [
                	'dropdown',
                	'dropdown-toggle',
                    'is-open',
                    'padded-numeric'
                ]
            },
            files: {
                src: ['src/templates/*.html'],
            }
        },
        html2js: {
            app: {
                options: {
                    base: './src/templates/',
                    useStrict: true,
                    quoteChar: '\'',
                    htmlmin: {
                        collapseBooleanAttributes: true,
                        collapseWhitespace: true,
                        removeAttributeQuotes: true,
                        removeComments: true,
                        removeEmptyAttributes: true,
                        removeRedundantAttributes: true,
                        removeScriptTypeAttributes: true,
                        removeStyleLinkTypeAttributes: true
                    }
                },
                src: ['./src/templates/*.html'],
                dest: './src/scripts/templates.js',
                module: 'datetime.bootstrap.templates'
            }
        },
        uglify: {
            js: {
                src: ['./dist/datetime-bootstrap.js'],
                dest: './dist/datetime-bootstrap.min.js'
            }
        },
        cssmin: {
            target: {
                files: {
                	'./dist/datetime-bootstrap.min.css': ['./dist/datetime-bootstrap.css']
                }
            }
        },
        watch: {
            files: [
                './src/templates/*.html',
                './src/scripts/*.js',
                './src/styles/*.css'
            ],
            tasks: 'quick'
        }
    });

    grunt.registerTask('default', [
        'htmlangular',
        'html2js',
        'concat',
        'uglify',
        'cssmin'
    ]);

    grunt.registerTask('quick', [
        'html2js',
        'concat',
        'uglify',
        'cssmin'
    ]) ;

};