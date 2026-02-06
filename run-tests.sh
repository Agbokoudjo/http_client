#!/bin/bash

# ============================================================================
# Script de test automatis� pour @wlindabla/http_client
# Usage: ./run-tests.sh [options]
# ============================================================================

set -e  # Arr�ter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COVERAGE_DIR="$PROJECT_ROOT/coverage"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"

# Fonction d'affichage
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}\u2713 $1${NC}"
}

print_error() {
    echo -e "${RED}\u2717 $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}\u26a0 $1${NC}"
}

print_info() {
    echo -e "${BLUE}\u2139 $1${NC}"
}

# Fonction de nettoyage
cleanup() {
    print_info "Nettoyage des fichiers temporaires..."
    rm -rf "$COVERAGE_DIR"
    rm -rf "$TEST_RESULTS_DIR"
    rm -rf node_modules/.vitest
    print_success "Nettoyage termin�"
}

# V�rifier Node.js et Yarn
check_requirements() {
    print_header "V�rification des pr�requis"
    
    # V�rifier Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js n'est pas install�"
        exit 1
    fi
    
    NODE_VERSION=$(node -v)
    print_success "Node.js $NODE_VERSION d�tect�"
    
    # V�rifier Yarn
    if ! command -v yarn &> /dev/null; then
        print_error "Yarn n'est pas install�"
        print_info "Installation: npm install -g yarn"
        exit 1
    fi
    
    YARN_VERSION=$(yarn -v)
    print_success "Yarn $YARN_VERSION d�tect�"
}

# Installer les d�pendances
install_dependencies() {
    print_header "Installation des d�pendances"
    
    if [ ! -d "node_modules" ]; then
        print_info "Installation des d�pendances..."
        yarn install --frozen-lockfile
        print_success "D�pendances install�es"
    else
        print_info "D�pendances d�j� install�es"
    fi
}

# V�rification du code (linting)
run_lint() {
    print_header "V�rification du code (Linting)"
    
    if [ -f "package.json" ] && grep -q "\"lint\"" package.json; then
        yarn lint || {
            print_error "Erreurs de linting d�tect�es"
            return 1
        }
        print_success "Aucune erreur de linting"
    else
        print_warning "Script de linting non configur�"
    fi
}

# V�rification des types TypeScript
run_typecheck() {
    print_header "V�rification des types TypeScript"
    
    if [ -f "tsconfig.json" ]; then
        yarn tsc --noEmit || {
            print_error "Erreurs de type d�tect�es"
            return 1
        }
        print_success "Aucune erreur de type"
    else
        print_warning "tsconfig.json non trouv�"
    fi
}

# Lancer les tests unitaires
run_unit_tests() {
    print_header "Tests unitaires"
    
    yarn vitest run tests/unit --reporter=verbose || {
        print_error "Tests unitaires �chou�s"
        return 1
    }
    
    print_success "Tests unitaires r�ussis"
}

# Lancer les tests d'int�gration
run_integration_tests() {
    print_header "Tests d'int�gration"
    
    if [ -d "tests/integration" ]; then
        yarn vitest run tests/integration --reporter=verbose || {
            print_error "Tests d'int�gration �chou�s"
            return 1
        }
        print_success "Tests d'int�gration r�ussis"
    else
        print_warning "Pas de tests d'int�gration trouv�s"
    fi
}

# Lancer les tests E2E
run_e2e_tests() {
    print_header "Tests End-to-End"
    
    if [ -d "tests/e2e" ]; then
        yarn vitest run tests/e2e --reporter=verbose || {
            print_error "Tests E2E �chou�s"
            return 1
        }
        print_success "Tests E2E r�ussis"
    else
        print_warning "Pas de tests E2E trouv�s"
    fi
}

# Lancer tous les tests avec couverture
run_all_tests_with_coverage() {
    print_header "Tous les tests avec couverture"
    
    yarn vitest run --coverage --reporter=verbose || {
        print_error "Tests �chou�s"
        return 1
    }
    
    print_success "Tous les tests r�ussis"
    
    # Afficher le r�sum� de la couverture
    if [ -d "$COVERAGE_DIR" ]; then
        print_info "Rapport de couverture g�n�r� dans: $COVERAGE_DIR"
        
        # Si lcov-report existe, afficher le lien
        if [ -f "$COVERAGE_DIR/index.html" ]; then
            print_info "Ouvrir le rapport: file://$COVERAGE_DIR/index.html"
        fi
    fi
}

# Tests sp�cifiques Node.js
run_node_tests() {
    print_header "Tests Node.js"
    
    yarn vitest run --environment node --reporter=verbose || {
        print_error "Tests Node.js �chou�s"
        return 1
    }
    
    print_success "Tests Node.js r�ussis"
}

# Tests sp�cifiques navigateur
run_browser_tests() {
    print_header "Tests Navigateur (jsdom)"
    
    yarn vitest run --environment jsdom --reporter=verbose || {
        print_error "Tests navigateur �chou�s"
        return 1
    }
    
    print_success "Tests navigateur r�ussis"
}

# Build du projet
run_build() {
    print_header "Build du projet"
    
    if [ -f "package.json" ] && grep -q "\"build\"" package.json; then
        yarn build || {
            print_error "Build �chou�"
            return 1
        }
        print_success "Build r�ussi"
        
        # V�rifier les fichiers de sortie
        if [ -d "dist" ]; then
            print_info "Fichiers g�n�r�s:"
            ls -lh dist/
        fi
    else
        print_warning "Script de build non configur�"
    fi
}

# G�n�rer un rapport de test complet
generate_report() {
    print_header "G�n�ration du rapport de test"
    
    mkdir -p "$TEST_RESULTS_DIR"
    
    yarn vitest run --coverage --reporter=json --reporter=junit \
        --outputFile="$TEST_RESULTS_DIR/test-results.json" || {
        print_error "�chec de la g�n�ration du rapport"
        return 1
    }
    
    print_success "Rapport g�n�r� dans: $TEST_RESULTS_DIR"
}

# Mode watch pour d�veloppement
run_watch_mode() {
    print_header "Mode Watch (d�veloppement)"
    print_info "Les tests se relanceront automatiquement � chaque modification"
    print_info "Appuyez sur 'q' pour quitter"
    
    yarn vitest
}

# Mode UI pour d�veloppement
run_ui_mode() {
    print_header "Mode UI (interface graphique)"
    print_info "Ouverture de l'interface de test dans le navigateur..."
    
    yarn vitest --ui
}

# V�rifier la couverture de code
check_coverage() {
    print_header "V�rification de la couverture"
    
    yarn vitest run --coverage --reporter=text || {
        print_error "La couverture est insuffisante"
        return 1
    }
    
    print_success "Couverture de code suffisante"
}

# Test de performance
run_performance_tests() {
    print_header "Tests de performance"
    
    print_info "Mesure du temps d'ex�cution des tests..."
    
    START_TIME=$(date +%s)
    yarn vitest run --silent
    END_TIME=$(date +%s)
    
    DURATION=$((END_TIME - START_TIME))
    print_success "Tests ex�cut�s en ${DURATION}s"
    
    if [ $DURATION -gt 60 ]; then
        print_warning "Les tests sont lents (>${DURATION}s). Envisager l'optimisation."
    fi
}

# Afficher l'aide
show_help() {
    cat << EOF
Usage: ./run-tests.sh [OPTIONS]

Options:
    -a, --all               Lancer tous les tests avec couverture
    -u, --unit              Lancer uniquement les tests unitaires
    -i, --integration       Lancer uniquement les tests d'int�gration
    -e, --e2e               Lancer uniquement les tests E2E
    -n, --node              Lancer les tests Node.js
    -b, --browser           Lancer les tests navigateur
    -w, --watch             Mode watch (d�veloppement)
    --ui                    Mode UI (interface graphique)
    -c, --coverage          V�rifier la couverture de code
    -l, --lint              Lancer le linting
    -t, --typecheck         V�rifier les types TypeScript
    --build                 Build du projet
    --report                G�n�rer un rapport complet
    --performance           Tester la performance
    --clean                 Nettoyer les fichiers de test
    --ci                    Mode CI (tout v�rifier)
    -h, --help              Afficher cette aide

Exemples:
    ./run-tests.sh --all                # Tous les tests avec couverture
    ./run-tests.sh --unit --coverage    # Tests unitaires avec couverture
    ./run-tests.sh --watch              # Mode d�veloppement
    ./run-tests.sh --ci                 # V�rification compl�te (CI/CD)

EOF
}

# Mode CI complet
run_ci_mode() {
    print_header "Mode CI - V�rification compl�te"
    
    local EXIT_CODE=0
    
    # 1. V�rifier les pr�requis
    check_requirements || EXIT_CODE=1
    
    # 2. Installer les d�pendances
    install_dependencies || EXIT_CODE=1
    
    # 3. Linting
    run_lint || EXIT_CODE=1
    
    # 4. Type checking
    run_typecheck || EXIT_CODE=1
    
    # 5. Tests avec couverture
    run_all_tests_with_coverage || EXIT_CODE=1
    
    # 6. Build
    run_build || EXIT_CODE=1
    
    # 7. G�n�rer le rapport
    generate_report || EXIT_CODE=1
    
    if [ $EXIT_CODE -eq 0 ]; then
        print_success "\u2705 Toutes les v�rifications CI ont r�ussi !"
    else
        print_error "\u274c Certaines v�rifications CI ont �chou�"
    fi
    
    return $EXIT_CODE
}

# Afficher un r�sum�
show_summary() {
    print_header "R�sum�"
    
    echo "\U0001f4ca Statistiques:"
    
    if [ -f "$COVERAGE_DIR/coverage-summary.json" ]; then
        echo "   Couverture: Voir $COVERAGE_DIR/index.html"
    fi
    
    if [ -d "dist" ]; then
        DIST_SIZE=$(du -sh dist | cut -f1)
        echo "   Taille du build: $DIST_SIZE"
    fi
    
    echo ""
    print_success "Tests termin�s avec succ�s ! \U0001f389"
}

# ============================================================================
# MAIN - Point d'entr�e du script
# ============================================================================

main() {
    # Si aucun argument, afficher l'aide
    if [ $# -eq 0 ]; then
        show_help
        exit 0
    fi
    
    # Parser les arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -a|--all)
                check_requirements
                install_dependencies
                run_all_tests_with_coverage
                show_summary
                shift
                ;;
            -u|--unit)
                check_requirements
                install_dependencies
                run_unit_tests
                shift
                ;;
            -i|--integration)
                check_requirements
                install_dependencies
                run_integration_tests
                shift
                ;;
            -e|--e2e)
                check_requirements
                install_dependencies
                run_e2e_tests
                shift
                ;;
            -n|--node)
                check_requirements
                install_dependencies
                run_node_tests
                shift
                ;;
            -b|--browser)
                check_requirements
                install_dependencies
                run_browser_tests
                shift
                ;;
            -w|--watch)
                check_requirements
                install_dependencies
                run_watch_mode
                shift
                ;;
            --ui)
                check_requirements
                install_dependencies
                run_ui_mode
                shift
                ;;
            -c|--coverage)
                check_requirements
                install_dependencies
                check_coverage
                shift
                ;;
            -l|--lint)
                check_requirements
                install_dependencies
                run_lint
                shift
                ;;
            -t|--typecheck)
                check_requirements
                install_dependencies
                run_typecheck
                shift
                ;;
            --build)
                check_requirements
                install_dependencies
                run_build
                shift
                ;;
            --report)
                check_requirements
                install_dependencies
                generate_report
                shift
                ;;
            --performance)
                check_requirements
                install_dependencies
                run_performance_tests
                shift
                ;;
            --clean)
                cleanup
                shift
                ;;
            --ci)
                run_ci_mode
                exit $?
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                print_error "Option inconnue: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Lancer le script
main "$@"