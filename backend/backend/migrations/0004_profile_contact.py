from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("backend", "0003_fill_handles_and_memberships"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="contact_email",
            field=models.EmailField(
                blank=True, default="", help_text="Public contact address (the account email stays private).",
                max_length=254,
            ),
        ),
        migrations.AddField(
            model_name="profile",
            name="contact_via",
            field=models.CharField(
                blank=True,
                choices=[
                    ("", "Automatic"), ("mail", "Email"), ("linkedin", "LinkedIn"),
                    ("website", "Website"), ("github", "GitHub"), ("none", "Hidden"),
                ],
                default="",
                help_text="Where 'Get in touch' leads. Empty: the first available of email, LinkedIn, website, GitHub.",
                max_length=10,
            ),
        ),
    ]
