#include <stdio.h>
#include <stdbool.h>

#define P 5 // Number of processes
#define R 3 // Number of resources

void calculateNeed(int need[P][R], int maxm[P][R], int allot[P][R])
{
    for (int i = 0; i < P; i++)
    {
        for (int j = 0; j < R; j++)
        {
            need[i][j] = maxm[i][j] - allot[i][j];
        }
    }
}

bool isSafe(int processes[], int avail[], int maxm[P][R], int allot[P][R])
{
    int need[P][R];
    calculateNeed(need, maxm, allot);

    bool finish[P] = {false};
    int safeSeq[P];
    int work[R];

    for (int i = 0; i < R; i++)
    {
        work[i] = avail[i];
    }

    int count = 0;
    while (count < P)
    {
        bool found = false;

        for (int p = 0; p < P; p++)
        {
            if (!finish[p])
            {
                int j;

                for (j = 0; j < R; j++)
                {
                    if (need[p][j] > work[j])
                    {
                        break;
                    }
                }

                if (j == R)
                {
                    for (int k = 0; k < R; k++)
                    {
                        work[k] += allot[p][k];
                    }

                    safeSeq[count++] = p;
                    finish[p] = true;
                    found = true;
                }
            }
        }

        if (!found)
        {
            printf("System is not in safe state\n");
            return false;
        }
    }

    printf("System is in safe state.\nSafe sequence is: ");
    for (int i = 0; i < P; i++)
    {
        printf("%d ", safeSeq[i]);
    }
    printf("\n");

    return true;
}

int main()
{
    int processes[P];
    int avail[R];
    int maxm[P][R];
    int allot[P][R];

    printf("Banker's Algorithm for Deadlock Avoidance\n\n");

    // Initialize process IDs
    for (int i = 0; i < P; i++)
    {
        processes[i] = i;
    }

    // Get available resources from user
    printf("Enter available resources (A B C): ");
    scanf("%d %d %d", &avail[0], &avail[1], &avail[2]);

    // Get maximum demand matrix
    printf("\nEnter maximum demand matrix:\n");
    for (int i = 0; i < P; i++)
    {
        printf("For process %d (A B C): ", i);
        scanf("%d %d %d", &maxm[i][0], &maxm[i][1], &maxm[i][2]);
    }

    // Get allocation matrix
    printf("\nEnter allocation matrix:\n");
    for (int i = 0; i < P; i++)
    {
        printf("For process %d (A B C): ", i);
        scanf("%d %d %d", &allot[i][0], &allot[i][1], &allot[i][2]);
    }

    // Check system safety
    printf("\nChecking system state...\n");
    isSafe(processes, avail, maxm, allot);

    return 0;
}