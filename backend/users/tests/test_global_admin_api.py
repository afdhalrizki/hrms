import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from users.global_constants import ROLE_SUPERADMIN, ROLE_SUPPORT, ROLE_ONBOARDING

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def superadmin_user(db):
    user = User.objects.create_user(
        email="super@harikerja.com", 
        password="password123", 
        global_role=ROLE_SUPERADMIN
    )
    return user

@pytest.fixture
def support_user(db):
    user = User.objects.create_user(
        email="support@harikerja.com", 
        password="password123", 
        global_role=ROLE_SUPPORT
    )
    return user

@pytest.mark.django_db
class TestGlobalAdminAPI:
    def test_list_unauthorized_if_not_superadmin(self, api_client, support_user):
        api_client.force_authenticate(user=support_user)
        response = api_client.get('/api/internal/global-admins/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_authorized_if_superadmin(self, api_client, superadmin_user, support_user):
        api_client.force_authenticate(user=superadmin_user)
        response = api_client.get('/api/internal/global-admins/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2  # superadmin + support_user

    def test_create_global_admin(self, api_client, superadmin_user):
        api_client.force_authenticate(user=superadmin_user)
        data = {
            "email": "new_admin@harikerja.com",
            "first_name": "New",
            "last_name": "Admin",
            "global_role": ROLE_ONBOARDING,
            "password": "securepassword"
        }
        response = api_client.post('/api/internal/global-admins/', data)
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email="new_admin@harikerja.com").exists()
        new_user = User.objects.get(email="new_admin@harikerja.com")
        assert new_user.global_role == ROLE_ONBOARDING
        assert new_user.check_password("securepassword")

    def test_update_global_admin(self, api_client, superadmin_user, support_user):
        api_client.force_authenticate(user=superadmin_user)
        data = {
            "first_name": "Support",
            "last_name": "Updated",
        }
        response = api_client.patch(f'/api/internal/global-admins/{support_user.id}/', data)
        assert response.status_code == status.HTTP_200_OK
        support_user.refresh_from_db()
        assert support_user.last_name == "Updated"

    def test_delete_support_admin(self, api_client, superadmin_user, support_user):
        api_client.force_authenticate(user=superadmin_user)
        response = api_client.delete(f'/api/internal/global-admins/{support_user.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not User.objects.filter(id=support_user.id).exists()

    def test_prevent_deleting_last_superadmin(self, api_client, superadmin_user):
        api_client.force_authenticate(user=superadmin_user)
        response = api_client.delete(f'/api/internal/global-admins/{superadmin_user.id}/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Cannot delete the last SUPERADMIN." in str(response.data)
        assert User.objects.filter(id=superadmin_user.id).exists()

    def test_allow_deleting_superadmin_if_multiple_exist(self, api_client, superadmin_user):
        User.objects.create_user(
            email="super2@harikerja.com", 
            password="password123", 
            global_role=ROLE_SUPERADMIN
        )
        api_client.force_authenticate(user=superadmin_user)
        response = api_client.delete(f'/api/internal/global-admins/{superadmin_user.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not User.objects.filter(id=superadmin_user.id).exists()
