import { members } from "@/data/community";
import type { Member } from "@/types/community";

export interface MembersRepository {
  list(): Promise<Member[]>;
  findById(id: string): Promise<Member | undefined>;
}

class MockMembersRepository implements MembersRepository {
  async list(): Promise<Member[]> {
    return members;
  }

  async findById(id: string): Promise<Member | undefined> {
    return members.find((member) => member.id === id);
  }
}

const repository: MembersRepository = new MockMembersRepository();

export async function listMembers(): Promise<Member[]> {
  return repository.list();
}

export async function getMemberById(id: string): Promise<Member | undefined> {
  return repository.findById(id);
}
