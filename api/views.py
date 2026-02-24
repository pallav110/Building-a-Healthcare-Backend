from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.shortcuts import render

from .models import Patient, Doctor, PatientDoctorMapping
from .serializers import (
    RegisterSerializer, LoginSerializer,
    PatientSerializer, DoctorSerializer, MappingSerializer,
)


def frontend(request):
    return render(request, 'api/index.html')


# ---- Auth Views ----

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"message": "User registered successfully", "user_id": user.id},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "Invalid email or password"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.check_password(password):
            return Response({"error": "Invalid email or password"}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })


# ---- Patient Views ----

class PatientListCreateView(generics.ListCreateAPIView):
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

    # only show patients that this user created
    def get_queryset(self):
        return Patient.objects.filter(created_by=self.request.user)

    # auto-attach the logged-in user as the creator
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PatientDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Patient.objects.filter(created_by=self.request.user)


# ---- Doctor Views ----

class DoctorListCreateView(generics.ListCreateAPIView):
    serializer_class = DoctorSerializer
    permission_classes = [IsAuthenticated]
    queryset = Doctor.objects.all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DoctorDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DoctorSerializer
    permission_classes = [IsAuthenticated]
    queryset = Doctor.objects.all()


# ---- Mapping Views ----

class MappingListCreateView(generics.ListCreateAPIView):
    serializer_class = MappingSerializer
    permission_classes = [IsAuthenticated]
    queryset = PatientDoctorMapping.objects.all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class MappingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    # GET /api/mappings/<patient_id>/ -> returns all doctors for that patient
    def get(self, request, pk):
        mappings = PatientDoctorMapping.objects.filter(patient_id=pk)
        serializer = MappingSerializer(mappings, many=True)
        return Response(serializer.data)

    # DELETE /api/mappings/<id>/ -> deletes a specific mapping by its own id
    def delete(self, request, pk):
        try:
            mapping = PatientDoctorMapping.objects.get(pk=pk)
        except PatientDoctorMapping.DoesNotExist:
            return Response({"error": "Mapping not found"}, status=status.HTTP_404_NOT_FOUND)

        mapping.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
