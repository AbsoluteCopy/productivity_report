from django.db import models

class User(models.Model):
    ROLE_CHOICES = [
        ('employee', 'Employee'),
        ('admin', 'Admin'),
    ]
    
    id_number = models.CharField(max_length=20, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='employee')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.id_number})"

    class Meta:
        db_table = 'users'
