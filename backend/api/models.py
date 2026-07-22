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

    @property
    def is_authenticated(self):
        return True

    class Meta:
        db_table = 'users'


class DailyReport(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_reports')
    date = models.DateField()
    task_category = models.CharField(max_length=100)
    task_list = models.JSONField(default=list)
    number_of_tasks = models.IntegerField(default=0)
    time_spent = models.IntegerField(default=0)
    meeting_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    work_type = models.CharField(max_length=100, null=True, blank=True)
    sub_category = models.CharField(max_length=100, null=True, blank=True)


    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name} - {self.date}"

    class Meta:
        db_table = 'daily_reports'
        ordering = ['-date']
