from django.urls import path
from . import views

urlpatterns = [
    # auth
    path('auth/register/', views.RegisterView.as_view()),
    path('auth/login/', views.LoginView.as_view()),

    # patients
    path('patients/', views.PatientListCreateView.as_view()),
    path('patients/<int:pk>/', views.PatientDetailView.as_view()),

    # doctors
    path('doctors/', views.DoctorListCreateView.as_view()),
    path('doctors/<int:pk>/', views.DoctorDetailView.as_view()),

    # patient-doctor mappings
    path('mappings/', views.MappingListCreateView.as_view()),
    path('mappings/<int:pk>/', views.MappingDetailView.as_view()),
]
