#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class LearnHubAPITester:
    def __init__(self, base_url="https://api-recovery-15.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.student_token = None
        self.instructor_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, description=""):
        """Run a single API test"""
        url = f"{self.base_url}/api{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        if description:
            print(f"   Description: {description}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.text else {}
                    if response_data and isinstance(response_data, dict):
                        # Print key info for successful responses
                        if 'message' in response_data:
                            print(f"   Message: {response_data['message']}")
                        if 'user' in response_data:
                            print(f"   User: {response_data['user'].get('name', 'N/A')} ({response_data['user'].get('role', 'N/A')})")
                        if 'categories' in response_data:
                            print(f"   Categories found: {len(response_data['categories'])}")
                        if 'courses' in response_data:
                            print(f"   Courses found: {len(response_data['courses'])}")
                except:
                    pass
                return True, response.json() if response.text else {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json() if response.text else {}
                    if 'detail' in error_data:
                        print(f"   Error: {error_data['detail']}")
                    elif 'error' in error_data:
                        print(f"   Error: {error_data['error']}")
                    else:
                        print(f"   Response: {response.text[:200]}")
                except:
                    print(f"   Response: {response.text[:200]}")
                
                self.failed_tests.append({
                    'name': name,
                    'endpoint': endpoint,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'error': response.text[:200]
                })
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ FAILED - Request timeout")
            self.failed_tests.append({
                'name': name,
                'endpoint': endpoint,
                'expected': expected_status,
                'actual': 'TIMEOUT',
                'error': 'Request timeout'
            })
            return False, {}
        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'endpoint': endpoint,
                'expected': expected_status,
                'actual': 'ERROR',
                'error': str(e)
            })
            return False, {}

    def test_database_init(self):
        """Test database initialization"""
        print("\n" + "="*50)
        print("TESTING DATABASE INITIALIZATION")
        print("="*50)
        
        success, response = self.run_test(
            "Database Init",
            "GET",
            "/init",
            200,
            description="Initialize and seed the database"
        )
        return success

    def test_categories(self):
        """Test categories endpoint"""
        print("\n" + "="*50)
        print("TESTING CATEGORIES")
        print("="*50)
        
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "/categories",
            200,
            description="Fetch all course categories"
        )
        
        if success and response.get('categories'):
            categories = response['categories']
            print(f"   Found {len(categories)} categories:")
            for cat in categories[:3]:  # Show first 3
                print(f"   - {cat.get('name', 'N/A')} ({cat.get('courseCount', 0)} courses)")
        
        return success

    def test_courses(self):
        """Test courses endpoint"""
        print("\n" + "="*50)
        print("TESTING COURSES")
        print("="*50)
        
        # Test basic courses list
        success1, response1 = self.run_test(
            "Get Courses (Popular)",
            "GET",
            "/courses?sort=popular&limit=6",
            200,
            description="Fetch popular courses with limit"
        )
        
        if success1 and response1.get('courses'):
            courses = response1['courses']
            print(f"   Found {len(courses)} courses:")
            for course in courses[:2]:  # Show first 2
                print(f"   - {course.get('title', 'N/A')} by {course.get('instructorName', 'N/A')}")
        
        # Test courses with different parameters
        success2, _ = self.run_test(
            "Get Courses (All)",
            "GET",
            "/courses",
            200,
            description="Fetch all courses"
        )
        
        return success1 and success2

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION")
        print("="*50)
        
        # Test admin login
        admin_success, admin_response = self.run_test(
            "Admin Login",
            "POST",
            "/auth/login",
            200,
            data={"email": "admin@learnhub.it", "password": "admin123"},
            description="Login as admin user"
        )
        
        if admin_success and admin_response.get('token'):
            self.admin_token = admin_response['token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
        
        # Test student login
        student_success, student_response = self.run_test(
            "Student Login",
            "POST",
            "/auth/login",
            200,
            data={"email": "student@learnhub.it", "password": "student123"},
            description="Login as student user"
        )
        
        if student_success and student_response.get('token'):
            self.student_token = student_response['token']
            print(f"   Student token obtained: {self.student_token[:20]}...")
        
        # Test instructor login (Marco)
        instructor_success, instructor_response = self.run_test(
            "Instructor Login",
            "POST",
            "/auth/login",
            200,
            data={"email": "marco@learnhub.it", "password": "marco123"},
            description="Login as instructor user"
        )
        
        if instructor_success and instructor_response.get('token'):
            self.instructor_token = instructor_response['token']
            print(f"   Instructor token obtained: {self.instructor_token[:20]}...")
        
        # Test invalid login
        invalid_success, _ = self.run_test(
            "Invalid Login",
            "POST",
            "/auth/login",
            401,
            data={"email": "invalid@test.com", "password": "wrongpass"},
            description="Test invalid credentials"
        )
        
        return admin_success and student_success and instructor_success and invalid_success

    def test_authenticated_endpoints(self):
        """Test endpoints that require authentication"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATED ENDPOINTS")
        print("="*50)
        
        if not self.admin_token or not self.student_token:
            print("❌ Cannot test authenticated endpoints - missing tokens")
            return False
        
        # Test /auth/me with admin token
        admin_me_success, _ = self.run_test(
            "Admin Profile",
            "GET",
            "/auth/me",
            200,
            token=self.admin_token,
            description="Get admin user profile"
        )
        
        # Test /auth/me with student token
        student_me_success, _ = self.run_test(
            "Student Profile",
            "GET",
            "/auth/me",
            200,
            token=self.student_token,
            description="Get student user profile"
        )
        
        # Test student dashboard
        student_dash_success, _ = self.run_test(
            "Student Dashboard",
            "GET",
            "/dashboard/student",
            200,
            token=self.student_token,
            description="Get student dashboard data"
        )
        
        # Test instructor dashboard
        instructor_dash_success, _ = self.run_test(
            "Instructor Dashboard",
            "GET",
            "/dashboard/instructor",
            200,
            token=self.instructor_token,
            description="Get instructor dashboard data"
        )
        
        # Test admin dashboard
        admin_dash_success, _ = self.run_test(
            "Admin Dashboard",
            "GET",
            "/dashboard/admin",
            200,
            token=self.admin_token,
            description="Get admin dashboard data"
        )
        
        return admin_me_success and student_me_success and student_dash_success and instructor_dash_success and admin_dash_success

    def test_course_details(self):
        """Test course detail endpoints"""
        print("\n" + "="*50)
        print("TESTING COURSE DETAILS")
        print("="*50)
        
        # First get a course ID
        success, response = self.run_test(
            "Get Courses for ID",
            "GET",
            "/courses?limit=1",
            200,
            description="Get first course for testing details"
        )
        
        if not success or not response.get('courses'):
            print("❌ Cannot test course details - no courses found")
            return False
        
        course_id = response['courses'][0]['id']
        print(f"   Testing with course ID: {course_id}")
        
        # Test course details
        detail_success, detail_response = self.run_test(
            "Course Details",
            "GET",
            f"/courses/{course_id}",
            200,
            description="Get detailed course information"
        )
        
        if detail_success and detail_response.get('course'):
            course = detail_response['course']
            print(f"   Course: {course.get('title', 'N/A')}")
            print(f"   Modules: {len(detail_response.get('modules', []))}")
            print(f"   Instructor: {detail_response.get('instructor', {}).get('name', 'N/A')}")
        
        return detail_success

    def test_user_registration(self):
        """Test user registration"""
        print("\n" + "="*50)
        print("TESTING USER REGISTRATION")
        print("="*50)
        
        # Generate unique email for testing
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        test_email = f"test_user_{timestamp}@learnhub.it"
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "/auth/register",
            200,
            data={
                "name": f"Test User {timestamp}",
                "email": test_email,
                "password": "testpass123",
                "role": "student"
            },
            description="Register a new student user"
        )
        
        if success and response.get('user'):
            print(f"   Registered user: {response['user'].get('name')} ({response['user'].get('email')})")
        
        # Test duplicate registration (should fail)
        duplicate_success, _ = self.run_test(
            "Duplicate Registration",
            "POST",
            "/auth/register",
            400,
            data={
                "name": "Duplicate User",
                "email": "admin@learnhub.it",  # Use existing email
                "password": "testpass123",
                "role": "student"
            },
            description="Test duplicate email registration (should fail)"
        )
        
        return success and duplicate_success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting LearnHub API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("="*70)
        
        # Run tests in logical order
        tests = [
            self.test_database_init,
            self.test_categories,
            self.test_courses,
            self.test_authentication,
            self.test_authenticated_endpoints,
            self.test_course_details,
            self.test_user_registration,
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ Test failed with exception: {str(e)}")
                self.failed_tests.append({
                    'name': test.__name__,
                    'endpoint': 'N/A',
                    'expected': 'SUCCESS',
                    'actual': 'EXCEPTION',
                    'error': str(e)
                })
        
        # Print final results
        print("\n" + "="*70)
        print("📊 FINAL TEST RESULTS")
        print("="*70)
        print(f"✅ Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print("\n🔍 FAILED TESTS SUMMARY:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['name']} - {test['endpoint']}")
                print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                print(f"   Error: {test['error']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 API tests mostly successful!")
            return 0
        elif success_rate >= 50:
            print("⚠️  API has some issues but core functionality works")
            return 1
        else:
            print("🚨 API has major issues - many endpoints failing")
            return 2

def main():
    tester = LearnHubAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())